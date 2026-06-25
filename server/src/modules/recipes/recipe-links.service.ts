import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Prisma, RecipeLinkKind, RecipeStatus, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RecipesService } from './recipes.service';

/** Minimal caller shape needed for ownership / draft-visibility decisions. */
type Requester = { userId: string; role: string } | undefined;

// Summary of a linked recipe returned alongside each link, so the client can
// render a clickable card without a second fetch. Raw rows otherwise — no mapper.
const linkedRecipeSelect = {
    id: true,
    title: true,
    slug: true,
    status: true,
    imageUrl: true,
} satisfies Prisma.RecipeSelect;

/**
 * Recipe-to-recipe links (M3). A link is a navigational relationship only —
 * ingredients / steps / nutrition never roll up across it. Three kinds:
 * PAIRS_WITH, USES, VARIATION_OF. Rules enforced here: no self-link, the target
 * must be published (drafts stay out of links), and only the source recipe's
 * author or an admin may link/unlink. Exact duplicates are blocked by the
 * schema's @@unique(fromId,toId,kind) and surface as 409 via PrismaExceptionFilter.
 */
@Injectable()
export class RecipeLinksService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly recipes: RecipesService,
    ) { }

    async create(
        fromId: number,
        toId: number,
        kind: RecipeLinkKind,
        requesterUserId: string,
        requesterRole: string,
    ) {
        if (fromId === toId) {
            throw new BadRequestException('A recipe cannot link to itself');
        }

        const from = await this.prisma.recipe.findUnique({
            where: { id: fromId },
            select: { id: true, authorId: true },
        });
        if (!from) {
            throw new NotFoundException(`Recipe ${fromId} not found`);
        }
        this.assertOwns(from.authorId, requesterUserId, requesterRole);

        const to = await this.prisma.recipe.findUnique({
            where: { id: toId },
            select: { id: true, status: true, authorId: true },
        });
        if (!to) {
            throw new NotFoundException(`Recipe ${toId} not found`);
        }
        if (to.status !== RecipeStatus.PUBLISHED) {
            // A draft the requester cannot see answers exactly like a missing
            // recipe — otherwise the 400/404 split is an oracle any writer
            // could probe to confirm a hidden draft exists at an id.
            const canSeeDraft =
                requesterRole === Role.ADMIN || to.authorId === requesterUserId;
            if (!canSeeDraft) {
                throw new NotFoundException(`Recipe ${toId} not found`);
            }
            throw new BadRequestException('A link cannot point at a draft recipe');
        }

        // Duplicate (fromId, toId, kind) → P2002 → 409 via PrismaExceptionFilter.
        return this.prisma.recipeLink.create({
            data: { fromId, toId, kind },
            include: { to: { select: linkedRecipeSelect } },
        });
    }

    /**
     * A recipe's links in both directions, each with the linked recipe summarised.
     * Links whose other end is currently a draft are hidden — this covers a target
     * that was published when linked and later unpublished. Draft-aware: a hidden
     * draft recipe 404s here just like a normal read.
     */
    async list(recipeId: number, requester?: Requester) {
        await this.recipes.assertReadable(recipeId, requester);

        const links = await this.prisma.recipeLink.findMany({
            where: { OR: [{ fromId: recipeId }, { toId: recipeId }] },
            include: {
                from: { select: linkedRecipeSelect },
                to: { select: linkedRecipeSelect },
            },
            orderBy: { createdAt: 'desc' },
        });

        const outgoing = links
            .filter(l => l.fromId === recipeId && l.to.status === RecipeStatus.PUBLISHED)
            .map(l => ({ ...l, derived: false }));
        const incoming = links
            .filter(l => l.toId === recipeId && l.from.status === RecipeStatus.PUBLISHED)
            .map(l => ({ ...l, derived: false }));

        // A recipe used AS an ingredient also surfaces here as an outgoing USES
        // link, DERIVED from the ingredient rows (the single source of truth — no
        // separate RecipeLink row to keep in sync). These have no link id and
        // aren't individually deletable; they're managed via the ingredient.
        const refRows = await this.prisma.recipeIngredient.findMany({
            where: { section: { recipeId }, recipeRefId: { not: null } },
            select: { recipeRef: { select: linkedRecipeSelect } },
        });
        const seen = new Set<number>(
            outgoing.filter(l => l.kind === RecipeLinkKind.USES).map(l => l.toId),
        );
        type DerivedUse = {
            id: number | null;
            fromId: number;
            toId: number;
            kind: RecipeLinkKind;
            derived: boolean;
            to: Prisma.RecipeGetPayload<{ select: typeof linkedRecipeSelect }>;
        };
        const derivedUses: DerivedUse[] = [];
        for (const row of refRows) {
            const ref = row.recipeRef;
            if (!ref || ref.status !== RecipeStatus.PUBLISHED || seen.has(ref.id)) continue;
            seen.add(ref.id);
            derivedUses.push({
                id: null as number | null,
                fromId: recipeId,
                toId: ref.id,
                kind: RecipeLinkKind.USES,
                derived: true,
                to: ref,
            });
        }

        return { outgoing: [...outgoing, ...derivedUses], incoming };
    }

    async remove(
        fromId: number,
        linkId: number,
        requesterUserId: string,
        requesterRole: string,
    ): Promise<void> {
        const link = await this.prisma.recipeLink.findUnique({
            where: { id: linkId },
            select: { id: true, fromId: true, from: { select: { authorId: true } } },
        });
        // 404 (not 403) when the link doesn't belong to this recipe, so we never
        // reveal that a link with that id exists under a different recipe.
        if (!link || link.fromId !== fromId) {
            throw new NotFoundException(`Link ${linkId} not found on recipe ${fromId}`);
        }
        this.assertOwns(link.from.authorId, requesterUserId, requesterRole);

        await this.prisma.recipeLink.delete({ where: { id: linkId } });
    }

    private assertOwns(authorId: string, requesterUserId: string, requesterRole: string): void {
        const isAdmin = requesterRole === Role.ADMIN;
        const isAuthor = authorId === requesterUserId;
        if (!isAdmin && !isAuthor) {
            throw new ForbiddenException('You can only link recipes you authored');
        }
    }
}
