import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Prisma, RecipeStatus, Role, TimeUnit, TranslationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IngredientsService } from './ingredients.service';
import { CreateRecipeDto } from './dtos/create-recipe.dto';
import { UpdateRecipeDto } from './dtos/update-recipe.dto';
import { DiscoverRecipesDto } from './dtos/discover-recipes.dto';
import { slugify } from './slug.util';

const recipeWithRelationsInclude = {
    ingredientSections: {
        include: {
            ingredients: { include: { ingredient: true } },
        },
    },
    stepSections: { include: { steps: true } },
    particularities: true,
    // like count rides along on every recipe read (cards show it; Discovery
    // sorts by it) — the rows themselves stay in the social module
    _count: { select: { likes: true } },
} satisfies Prisma.RecipeInclude;

/**
 * Single-recipe reads also pull each ingredient's localized names so a reader
 * viewing the recipe in French/Vietnamese sees translated ingredient names.
 * List endpoints (Discovery, My Recipes) deliberately use the lighter include.
 */
const recipeDetailInclude = {
    ...recipeWithRelationsInclude,
    ingredientSections: {
        include: {
            ingredients: { include: { ingredient: { include: { translations: true } } } },
        },
    },
} satisfies Prisma.RecipeInclude;

/** Minimal shape of the authenticated caller a read needs to make draft decisions. */
type Requester = { userId: string; role: string } | undefined;

/** Slug bases that would shadow client routes (e.g. /recipes/create). */
const RESERVED_SLUGS = new Set(['create', 'edit']);

/**
 * Prisma `contains` passes LIKE metacharacters (% _ \) straight to Postgres
 * (prisma/prisma#5476) — escape them so user search text is matched literally
 * and crafted patterns can't force pathological ILIKE scans.
 */
function escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, '\\$&');
}

@Injectable()
export class RecipesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly ingredients: IngredientsService,
    ) { }

    // ─── Reads ─────────────────────────────────────────────────────────

    /** Discovery: PUBLISHED recipes only, with optional search / filters / sort. */
    findAll(query: DiscoverRecipesDto = {}, requester?: Requester) {
        const take = query.take ? Math.min(query.take, 100) : 50;
        const skip = query.skip ?? 0;
        return this.prisma.recipe.findMany({
            where: this.buildDiscoveryWhere(query),
            include: {
                ...recipeWithRelationsInclude,
                // the CALLER's own like row only (never other users') — lets a
                // card render its heart filled/empty without one likes request
                // per recipe. Anonymous reads don't get the key at all.
                ...(requester
                    ? {
                          likes: {
                              where: { userId: requester.userId },
                              select: { userId: true },
                          },
                      }
                    : {}),
            },
            take,
            skip,
            // 'popular' ranks by like count; 'newest' (default) by creation date.
            // `id` is a stable tiebreaker so skip/take pagination never drops or
            // repeats a row when the primary sort key ties.
            orderBy: query.sort === 'popular'
                ? [{ likes: { _count: 'desc' } }, { id: 'desc' }]
                : [{ createdAt: 'desc' }, { id: 'desc' }],
        });
    }

    /** The author's own recipes, Drafts included. Backs the My Recipes page. */
    findMine(authorId: string) {
        return this.prisma.recipe.findMany({
            where: { authorId },
            include: recipeWithRelationsInclude,
            // recently-worked-on first; `id` keeps the order stable on ties
            orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        });
    }

    /**
     * The caller's liked recipes — their "saved list" (M5). PUBLISHED only:
     * a recipe you saved that was later unpublished drops off the list (it's no
     * longer readable), mirroring Discovery. Ordered most-recently-saved first
     * via Like.createdAt. Each row carries the caller's own like row so the
     * card heart renders filled — same shape Discovery cards consume.
     */
    async findLiked(userId: string) {
        const likes = await this.prisma.like.findMany({
            where: { userId, recipe: { status: RecipeStatus.PUBLISHED } },
            // recipeId is the stable tiebreaker (Like has no id) — keeps the
            // order deterministic when createdAt ties, e.g. across legacy likes
            // all backfilled with the migration's single timestamp
            orderBy: [{ createdAt: 'desc' }, { recipeId: 'desc' }],
            include: {
                recipe: {
                    include: {
                        ...recipeWithRelationsInclude,
                        likes: { where: { userId }, select: { userId: true } },
                    },
                },
            },
        });
        return likes.map(like => like.recipe);
    }

    async findOne(id: number, requester?: Requester) {
        const recipe = await this.prisma.recipe.findUnique({
            where: { id },
            include: recipeDetailInclude,
        });
        return this.guardDraft(recipe, id, requester);
    }

    async findBySlug(slug: string, requester?: Requester) {
        const recipe = await this.prisma.recipe.findUnique({
            where: { slug },
            include: recipeDetailInclude,
        });
        return this.guardDraft(recipe, slug, requester);
    }

    /**
     * Throws 404 if the recipe is missing, or is a draft the caller may not see.
     * Used by read-side endpoints that don't return the recipe row themselves
     * (e.g. on-demand nutrition) so a draft never leaks via a side channel.
     */
    async assertReadable(id: number, requester?: Requester): Promise<void> {
        const recipe = await this.prisma.recipe.findUnique({
            where: { id },
            select: { status: true, authorId: true },
        });
        this.guardDraft(recipe, id, requester);
    }

    // ─── Writes ────────────────────────────────────────────────────────

    async create(dto: CreateRecipeDto, authorId: string) {
        await this.verifyIngredientsExist(dto);
        const status = dto.status ?? RecipeStatus.DRAFT;
        const slug = await this.generateUniqueSlug(dto.title);
        return this.prisma.recipe.create({
            data: {
                ...this.buildRecipeContent(dto, authorId),
                slug,
                status,
                publishedAt: status === RecipeStatus.PUBLISHED ? new Date() : null,
            },
            include: recipeDetailInclude,
        });
    }

    async update(
        id: number,
        dto: UpdateRecipeDto,
        requesterUserId: string,
        requesterRole: string,
    ) {
        const existing = await this.prisma.recipe.findUnique({
            where: { id },
            select: { id: true, authorId: true, publishedAt: true },
        });
        if (!existing) {
            throw new NotFoundException(`Recipe ${id} not found`);
        }
        this.assertCanModify(existing.authorId, requesterUserId, requesterRole, 'modify');

        await this.verifyIngredientsExist(dto);

        // The slug re-tracks the title only while the recipe has NEVER been
        // published (publishedAt === null). Once published, the slug is frozen
        // for life so shared links never break — see ADR-03.
        const slug = existing.publishedAt === null
            ? await this.generateUniqueSlug(dto.title, id)
            : undefined;

        // The recipe is an aggregate: child rows are wiped and recreated rather
        // than diffed, to keep the write logic small. Wrapped in a transaction
        // so the recipe is never left without sections. Status/publishedAt are
        // deliberately untouched here — publishing is its own endpoint.
        return this.prisma.$transaction(async tx => {
            await tx.ingredientSection.deleteMany({ where: { recipeId: id } });
            await tx.stepSection.deleteMany({ where: { recipeId: id } });
            await tx.particularity.deleteMany({ where: { recipeId: id } });

            return tx.recipe.update({
                where: { id },
                data: {
                    ...this.buildRecipeContent(dto, existing.authorId),
                    ...(slug ? { slug } : {}),
                },
                include: recipeDetailInclude,
            });
        });
    }

    /** Make a recipe public. Freezes the slug on the FIRST publish (ADR-03). Idempotent. */
    async publish(id: number, requesterUserId: string, requesterRole: string) {
        const existing = await this.prisma.recipe.findUnique({
            where: { id },
            select: { id: true, authorId: true, publishedAt: true },
        });
        if (!existing) {
            throw new NotFoundException(`Recipe ${id} not found`);
        }
        this.assertCanModify(existing.authorId, requesterUserId, requesterRole, 'publish');

        return this.prisma.recipe.update({
            where: { id },
            data: {
                status: RecipeStatus.PUBLISHED,
                publishedAt: existing.publishedAt ?? new Date(),
            },
            include: recipeDetailInclude,
        });
    }

    /** Pull a recipe back to private. publishedAt is kept, so the slug stays frozen. */
    async unpublish(id: number, requesterUserId: string, requesterRole: string) {
        const existing = await this.prisma.recipe.findUnique({
            where: { id },
            select: { id: true, authorId: true },
        });
        if (!existing) {
            throw new NotFoundException(`Recipe ${id} not found`);
        }
        this.assertCanModify(existing.authorId, requesterUserId, requesterRole, 'unpublish');

        return this.prisma.recipe.update({
            where: { id },
            data: { status: RecipeStatus.DRAFT },
            include: recipeDetailInclude,
        });
    }

    async remove(id: number, requesterUserId: string, requesterRole: string): Promise<void> {
        const existing = await this.prisma.recipe.findUnique({
            where: { id },
            select: { id: true, authorId: true },
        });
        if (!existing) {
            throw new NotFoundException(`Recipe ${id} not found`);
        }
        this.assertCanModify(existing.authorId, requesterUserId, requesterRole, 'delete');

        // Child rows (sections, steps, particularities, likes, comments,
        // translations, links) cascade-delete via the schema's onDelete: Cascade.
        await this.prisma.recipe.delete({ where: { id } });
    }

    // ─── Helpers ───────────────────────────────────────────────────────

    /**
     * Returns the recipe when the caller may see it. A DRAFT is visible only to
     * its author and ADMINs; everyone else gets a 404 — we never reveal that a
     * draft exists. `ref` is the id or slug, used only for the error message.
     */
    private guardDraft<T extends { status: RecipeStatus; authorId: string }>(
        recipe: T | null,
        ref: number | string,
        requester?: Requester,
    ): T {
        if (!recipe) {
            throw new NotFoundException(`Recipe ${ref} not found`);
        }
        if (recipe.status === RecipeStatus.DRAFT && !this.canViewDraft(recipe.authorId, requester)) {
            throw new NotFoundException(`Recipe ${ref} not found`);
        }
        return recipe;
    }

    private canViewDraft(authorId: string, requester?: Requester): boolean {
        if (!requester) return false;
        return requester.role === Role.ADMIN || requester.userId === authorId;
    }

    private assertCanModify(
        authorId: string,
        requesterUserId: string,
        requesterRole: string,
        verb: string,
    ): void {
        const isAdmin = requesterRole === Role.ADMIN;
        const isAuthor = authorId === requesterUserId;
        if (!isAdmin && !isAuthor) {
            throw new ForbiddenException(`You can only ${verb} your own recipes`);
        }
    }

    /**
     * Generates a slug from the title and makes it unique by appending `-2`,
     * `-3`, … on collision. `excludeRecipeId` lets a recipe keep its own slug
     * when regenerating during an update.
     *
     * Invariant: a slug never LOOKS like a numeric id and never shadows a
     * client route word. /recipes/2024 must always mean "recipe id 2024" and
     * /recipes/create must always be the authoring screen — so a title like
     * "2024" or "Create" gets a "recipe-" prefix.
     */
    private async generateUniqueSlug(title: string, excludeRecipeId?: number): Promise<string> {
        let base = slugify(title) || 'recipe';
        if (/^\d+$/.test(base) || RESERVED_SLUGS.has(base)) {
            base = `recipe-${base}`;
        }
        let candidate = base;
        for (let n = 2; await this.slugTaken(candidate, excludeRecipeId); n++) {
            candidate = `${base}-${n}`;
        }
        return candidate;
    }

    private async slugTaken(slug: string, excludeRecipeId?: number): Promise<boolean> {
        const existing = await this.prisma.recipe.findUnique({
            where: { slug },
            select: { id: true },
        });
        return existing !== null && existing.id !== excludeRecipeId;
    }

    private buildDiscoveryWhere(query: DiscoverRecipesDto): Prisma.RecipeWhereInput {
        const where: Prisma.RecipeWhereInput = { status: RecipeStatus.PUBLISHED };

        if (query.q) {
            const q = escapeLike(query.q);
            where.OR = [
                { title: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
            ];
            // Cross-language search: when a content language is active, also match
            // the recipe's APPROVED title/description translations in that locale.
            // For the base locale there simply are no Translation rows, so this
            // clause harmlessly matches nothing.
            if (query.locale) {
                where.OR.push({
                    translations: {
                        some: {
                            locale: query.locale.toLowerCase(),
                            field: { in: ['title', 'description'] },
                            value: { contains: q, mode: 'insensitive' },
                            status: TranslationStatus.APPROVED,
                        },
                    },
                });
            }
        }
        if (query.cuisine) {
            // contains, not equals: "nam" should find "Viêt Nam" — the client
            // exposes this as free text
            where.cuisine = { contains: escapeLike(query.cuisine), mode: 'insensitive' };
        }
        if (query.difficulty) where.difficulty = query.difficulty;
        if (query.type) where.type = query.type;
        if (query.diet) {
            where.particularities = { some: { type: query.diet } };
        }
        if (query.ingredient) {
            where.ingredientSections = {
                some: {
                    ingredients: {
                        some: {
                            ingredient: {
                                name: { contains: escapeLike(query.ingredient), mode: 'insensitive' },
                            },
                        },
                    },
                },
            };
        }
        return where;
    }

    private async verifyIngredientsExist(dto: CreateRecipeDto | UpdateRecipeDto): Promise<void> {
        const ids = dto.ingredientSections.flatMap(s => s.ingredients.map(i => i.ingredientId));
        const missing = await this.ingredients.findMissingIngredients(ids);
        if (missing.length > 0) {
            throw new BadRequestException(
                `The following ingredient IDs do not exist: ${missing.join(', ')}`,
            );
        }
    }

    /**
     * The shared content fields of a recipe (everything except slug / status /
     * publishedAt, which the create / publish paths own). Used by both create
     * and update.
     */
    private buildRecipeContent(
        dto: CreateRecipeDto | UpdateRecipeDto,
        authorId: string,
    ): Omit<Prisma.RecipeCreateInput, 'slug' | 'status' | 'publishedAt'> {
        return {
            title: dto.title,
            description: dto.description ?? null,
            locale: dto.locale,
            prepTime: dto.prepTime,
            prepTimeUnit: dto.prepTimeUnit ?? TimeUnit.MINUTES,
            cookTime: dto.cookTime,
            cookTimeUnit: dto.cookTimeUnit ?? TimeUnit.MINUTES,
            difficulty: dto.difficulty,
            type: dto.type,
            cuisine: dto.cuisine,
            servings: dto.servings,
            imageUrl: dto.imageUrl ?? null,
            yield: dto.yield ?? null,
            author: { connect: { id: authorId } },
            ingredientSections: {
                create: dto.ingredientSections.map(section => ({
                    name: section.name,
                    ingredients: {
                        create: section.ingredients.map(ing => ({
                            ingredientId: ing.ingredientId,
                            quantity: ing.quantity,
                            unit: ing.unit,
                        })),
                    },
                })),
            },
            stepSections: {
                create: dto.stepSections.map(section => ({
                    title: section.title,
                    steps: {
                        create: section.steps.map(step => ({
                            order: step.order,
                            description: step.description,
                            mediaUrl: step.mediaUrl,
                        })),
                    },
                })),
            },
            particularities: dto.particularities && dto.particularities.length > 0
                ? { create: dto.particularities.map(type => ({ type })) }
                : undefined,
        };
    }
}
