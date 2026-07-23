import {
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
import {
    fieldValidationException,
    recipeIncompleteException,
} from '../../shared/validation-exception.factory';
import { findRecipeCompletenessErrors, RecipeCompletenessShape } from './recipe-completeness';

/** Brief shape of a recipe referenced AS an ingredient — the clickable link target. */
const linkedRecipeBrief = { id: true, title: true, slug: true, status: true } satisfies Prisma.RecipeSelect;

const recipeWithRelationsInclude = {
    // orderBy id everywhere keeps sections and rows in authoring order — the
    // update path wipes and recreates them in the submitted array order, so the
    // surrogate ids increase in that order and `orderBy id` replays it. This is
    // what makes the editor's up/down reordering persist. Steps additionally
    // carry an explicit `order` field.
    ingredientSections: {
        orderBy: { id: 'asc' },
        include: {
            ingredients: {
                include: { ingredient: true, recipeRef: { select: linkedRecipeBrief } },
                orderBy: { id: 'asc' },
            },
        },
    },
    stepSections: {
        orderBy: { id: 'asc' },
        include: { steps: { orderBy: { order: 'asc' } } },
    },
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
        orderBy: { id: 'asc' },
        include: {
            ingredients: {
                include: {
                    ingredient: { include: { translations: true } },
                    recipeRef: { select: linkedRecipeBrief },
                },
                orderBy: { id: 'asc' },
            },
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

    async create(dto: CreateRecipeDto, authorId: string, force = false) {
        await this.verifyIngredientRows(dto);
        const status = dto.status ?? RecipeStatus.DRAFT;
        // Publishing in one step should be complete — but the author can override
        // (force). A draft may always be saved blank or partial.
        if (status === RecipeStatus.PUBLISHED) this.assertRecipeComplete(dto, force);
        const refTitles = await this.loadRefTitles(dto);
        const slug = await this.generateUniqueSlug(dto.title);
        return this.prisma.recipe.create({
            data: {
                ...this.buildRecipeContent(dto, authorId, refTitles),
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
        force = false,
    ) {
        const existing = await this.prisma.recipe.findUnique({
            where: { id },
            select: { id: true, authorId: true, publishedAt: true, status: true },
        });
        if (!existing) {
            throw new NotFoundException(`Recipe ${id} not found`);
        }
        this.assertCanModify(existing.authorId, requesterUserId, requesterRole, 'modify');

        // Recipe refs already stored on this recipe are grandfathered past the
        // must-be-published check, so a later-unpublished sub-recipe doesn't block
        // saving unrelated edits (its nutrition just stops rolling up).
        const grandfatheredRefIds = await this.loadStoredRefIds(id);
        await this.verifyIngredientRows(dto, id, grandfatheredRefIds);
        // A DRAFT is a scratchpad — saving it never blocks on completeness (this
        // is what makes background autosave safe). An already-PUBLISHED recipe is
        // LIVE, so saving it incomplete would degrade public content: that raises
        // the overridable RECIPE_INCOMPLETE warning unless the author confirmed
        // (force). The client only autosaves drafts, never published recipes.
        if (existing.status === RecipeStatus.PUBLISHED) this.assertRecipeComplete(dto, force);
        const refTitles = await this.loadRefTitles(dto);

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
                    ...this.buildRecipeContent(dto, existing.authorId, refTitles),
                    ...(slug ? { slug } : {}),
                },
                include: recipeDetailInclude,
            });
        });
    }

    /** Make a recipe public. Freezes the slug on the FIRST publish (ADR-03). Idempotent. */
    async publish(id: number, requesterUserId: string, requesterRole: string, force = false) {
        // Pull the stored content (ordered to match how the editor indexes rows,
        // so a completeness 400 highlights the right ones) — publishing an
        // incomplete draft raises the overridable RECIPE_INCOMPLETE 400 unless the
        // author already confirmed (force).
        const existing = await this.prisma.recipe.findUnique({
            where: { id },
            select: {
                id: true,
                authorId: true,
                publishedAt: true,
                cuisine: true,
                ingredientSections: {
                    orderBy: { id: 'asc' },
                    select: {
                        name: true,
                        ingredients: {
                            orderBy: { id: 'asc' },
                            select: {
                                ingredientId: true,
                                recipeRefId: true,
                                displayName: true,
                                unit: true,
                            },
                        },
                    },
                },
                stepSections: {
                    orderBy: { id: 'asc' },
                    select: {
                        title: true,
                        steps: { orderBy: { order: 'asc' }, select: { description: true } },
                    },
                },
            },
        });
        if (!existing) {
            throw new NotFoundException(`Recipe ${id} not found`);
        }
        this.assertCanModify(existing.authorId, requesterUserId, requesterRole, 'publish');
        this.assertRecipeComplete(existing, force);

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

    /**
     * Validate the INTEGRITY of every ingredient row (runs for drafts too, so a
     * draft never persists referential garbage). Each row is at most ONE nutrition
     * source — a catalogue ingredient OR a recipe-as-ingredient — never both.
     * Catalogue ids and recipe refs must exist; a recipe ref must be published,
     * not this recipe, and not form a cycle. Row COMPLETENESS (a source or name,
     * plus a unit) is a separate publish-time concern — see assertRecipeComplete.
     * `parentId` is the recipe being edited (undefined on create — a brand-new
     * recipe can't be referenced yet, so it can't be in a cycle).
     * `grandfatheredRefIds` are recipe refs already stored on this recipe: they
     * keep saving even if their target was later unpublished (the picker only
     * ever offers published recipes, so a newly-added draft ref can't arise here).
     */
    private async verifyIngredientRows(
        dto: CreateRecipeDto | UpdateRecipeDto,
        parentId?: number,
        grandfatheredRefIds: ReadonlySet<number> = new Set(),
    ): Promise<void> {
        // Collect EVERY offending row (not fail-fast) so the author sees all
        // incomplete rows at once. Each error carries the row's dotted path so
        // the client can highlight that exact row.
        const errors: { path: string; message: string }[] = [];
        const rowPath = (si: number, ri: number) => `ingredientSections.${si}.ingredients.${ri}`;

        dto.ingredientSections.forEach((section, si) => {
            section.ingredients.forEach((r, ri) => {
                // Integrity only — a row may point at a catalogue ingredient OR a
                // recipe, never both. Whether a row is COMPLETE (carries a source
                // or a name, and a unit) is a publish-time concern owned by
                // assertRecipeComplete, so a DRAFT may hold blank rows.
                if (r.ingredientId != null && r.recipeRefId != null) {
                    errors.push({
                        path: rowPath(si, ri),
                        message: 'An ingredient cannot be both a catalogue ingredient and a recipe',
                    });
                }
            });
        });

        const ingredientIds = dto.ingredientSections
            .flatMap(s => s.ingredients)
            .map(r => r.ingredientId)
            .filter((id): id is number => id != null);
        const missing = new Set(await this.ingredients.findMissingIngredients(ingredientIds));
        if (missing.size > 0) {
            dto.ingredientSections.forEach((section, si) => {
                section.ingredients.forEach((r, ri) => {
                    if (r.ingredientId != null && missing.has(r.ingredientId)) {
                        errors.push({ path: rowPath(si, ri), message: `Ingredient ${r.ingredientId} does not exist` });
                    }
                });
            });
        }

        const refIds = [
            ...new Set(
                dto.ingredientSections
                    .flatMap(s => s.ingredients)
                    .map(r => r.recipeRefId)
                    .filter((id): id is number => id != null),
            ),
        ];
        if (refIds.length > 0) {
            const badRefs = await this.collectBadRecipeRefs(refIds, parentId, grandfatheredRefIds);
            if (badRefs.size > 0) {
                dto.ingredientSections.forEach((section, si) => {
                    section.ingredients.forEach((r, ri) => {
                        const reason = r.recipeRefId != null ? badRefs.get(r.recipeRefId) : undefined;
                        if (reason) errors.push({ path: rowPath(si, ri), message: reason });
                    });
                });
            }
        }

        if (errors.length > 0) throw fieldValidationException(errors);
    }

    /**
     * The publishability contract: a recipe being published should be complete.
     * Raises an OVERRIDABLE, field-scoped 400 (`RECIPE_INCOMPLETE`) — the client
     * turns it into a "publish anyway?" confirmation and, on confirm, retries with
     * `force`, which skips this check. Callers pass the caller's own choice via
     * `force`; drafts and plain content saves (PUT) never reach here at all.
     */
    private assertRecipeComplete(recipe: RecipeCompletenessShape, force: boolean): void {
        if (force) return;
        const errors = findRecipeCompletenessErrors(recipe);
        if (errors.length > 0) throw recipeIncompleteException(errors);
    }

    /**
     * For each recipe ref, the reason it can't be used (if any): doesn't exist,
     * is this recipe, is an unpublished NEW ref, or would form a cycle. Returns
     * a map refId → reason so callers can tie each to the row(s) that use it.
     * A grandfathered ref (already stored on this recipe) is tolerated even if
     * its target was since unpublished — only newly-added refs must be published.
     */
    private async collectBadRecipeRefs(
        refIds: number[],
        parentId?: number,
        grandfatheredRefIds: ReadonlySet<number> = new Set(),
    ): Promise<Map<number, string>> {
        const bad = new Map<number, string>();
        const refs = await this.prisma.recipe.findMany({
            where: { id: { in: refIds } },
            select: { id: true, status: true },
        });
        const status = new Map(refs.map(r => [r.id, r.status]));
        for (const id of refIds) {
            if (parentId != null && id === parentId) {
                bad.set(id, 'A recipe cannot use itself as an ingredient');
            } else if (!status.has(id)) {
                bad.set(id, `Recipe ${id} does not exist`);
            } else if (status.get(id) !== RecipeStatus.PUBLISHED && !grandfatheredRefIds.has(id)) {
                bad.set(id, 'A recipe used as an ingredient must be published');
            } else if (parentId != null && await this.refReaches(id, parentId)) {
                bad.set(id, 'Using that recipe would create a cycle (it already uses this recipe)');
            }
        }
        return bad;
    }

    /** Recipe-ref ids currently stored on a recipe's ingredient rows. */
    private async loadStoredRefIds(recipeId: number): Promise<ReadonlySet<number>> {
        const rows = await this.prisma.recipeIngredient.findMany({
            where: { section: { recipeId }, recipeRefId: { not: null } },
            select: { recipeRefId: true },
        });
        return new Set(rows.map(r => r.recipeRefId as number));
    }

    /**
     * Titles of every recipe referenced AS an ingredient in the dto, snapshotted
     * into the row's displayName on save. If that recipe is later deleted (the FK
     * nulls recipeRefId), the row degrades to a readable free-text line with the
     * recipe's former name instead of going blank.
     */
    private async loadRefTitles(
        dto: CreateRecipeDto | UpdateRecipeDto,
    ): Promise<ReadonlyMap<number, string>> {
        const refIds = [
            ...new Set(
                dto.ingredientSections
                    .flatMap(s => s.ingredients)
                    .map(i => i.recipeRefId)
                    .filter((id): id is number => id != null),
            ),
        ];
        if (refIds.length === 0) return new Map();
        const recipes = await this.prisma.recipe.findMany({
            where: { id: { in: refIds } },
            select: { id: true, title: true },
        });
        return new Map(recipes.map(r => [r.id, r.title]));
    }

    /** True if `startId` reaches `targetId` by following recipe-as-ingredient edges. */
    private async refReaches(startId: number, targetId: number): Promise<boolean> {
        const visited = new Set<number>([startId]);
        let frontier = [startId];
        for (let depth = 0; frontier.length > 0 && depth < 20; depth++) {
            const rows = await this.prisma.recipeIngredient.findMany({
                where: { section: { recipeId: { in: frontier } }, recipeRefId: { not: null } },
                select: { recipeRefId: true },
            });
            const next: number[] = [];
            for (const row of rows) {
                const rid = row.recipeRefId!;
                if (rid === targetId) return true;
                if (!visited.has(rid)) {
                    visited.add(rid);
                    next.push(rid);
                }
            }
            frontier = next;
        }
        return false;
    }

    /**
     * The shared content fields of a recipe (everything except slug / status /
     * publishedAt, which the create / publish paths own). Used by both create
     * and update.
     */
    private buildRecipeContent(
        dto: CreateRecipeDto | UpdateRecipeDto,
        authorId: string,
        refTitles: ReadonlyMap<number, string> = new Map(),
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
                            ingredientId: ing.ingredientId ?? null,
                            recipeRefId: ing.recipeRefId ?? null,
                            // for a recipe-ref row, snapshot the referenced
                            // recipe's title (so it survives that recipe's
                            // deletion); otherwise the author's free-text name
                            displayName: ing.recipeRefId != null
                                ? (refTitles.get(ing.recipeRefId) ?? null)
                                : (ing.displayName?.trim() || null),
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
