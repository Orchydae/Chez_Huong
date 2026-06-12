import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Comment, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RecipesService } from '../recipes/recipes.service';

const commentAuthorSelect = {
    id: true,
    firstName: true,
    lastName: true,
} satisfies Prisma.UserSelect;

/**
 * Two-level reply include used by both write-time returns and the recipe
 * comments listing. Beyond two levels of nesting, replies are accessible by
 * re-fetching the deeper subtree via getReplies (the "load more replies" step).
 *
 * `_count.replies` rides along at every level so the client knows whether a
 * comment has children it isn't yet showing — that's the signal that decides
 * whether to offer "load more replies" on the deepest rendered comment.
 * Replies are ordered oldest-first so a thread reads top-to-bottom.
 */
const commentWithRepliesInclude = {
    user: { select: commentAuthorSelect },
    _count: { select: { replies: true } },
    replies: {
        orderBy: { createdAt: 'asc' },
        include: {
            user: { select: commentAuthorSelect },
            _count: { select: { replies: true } },
            replies: {
                orderBy: { createdAt: 'asc' },
                include: {
                    user: { select: commentAuthorSelect },
                    _count: { select: { replies: true } },
                },
            },
        },
    },
} satisfies Prisma.CommentInclude;

/** Same shape RecipesService.assertReadable expects; undefined = anonymous. */
type Requester = { userId: string; role: string } | undefined;

/**
 * Every recipe-scoped method asserts the recipe is readable by the caller
 * FIRST (404 on hidden drafts) — otherwise like/comment counts and writes
 * become an oracle confirming a hidden draft exists at an id, and likes on
 * unreadable recipes could inflate the public count / popular ranking.
 */
@Injectable()
export class SocialInteractionService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly recipes: RecipesService,
    ) { }

    // ─── Likes ────────────────────────────────────────────────────────

    async toggleLike(
        userId: string,
        role: string,
        recipeId: number,
    ): Promise<{ liked: boolean; likeCount: number }> {
        await this.recipes.assertReadable(recipeId, { userId, role });
        const existing = await this.prisma.like.findUnique({
            where: { userId_recipeId: { userId, recipeId } },
        });

        if (existing) {
            await this.prisma.like.delete({ where: { userId_recipeId: { userId, recipeId } } });
        } else {
            await this.prisma.like.create({ data: { userId, recipeId } });
        }

        const likeCount = await this.prisma.like.count({ where: { recipeId } });
        return { liked: !existing, likeCount };
    }

    /**
     * Like count plus whether the CALLER liked it — so the heart renders
     * filled/empty on page load. Anonymous callers always get likedByMe: false.
     */
    async getLikeCount(
        recipeId: number,
        requester: Requester,
    ): Promise<{ likeCount: number; likedByMe: boolean }> {
        await this.recipes.assertReadable(recipeId, requester);
        const [likeCount, own] = await Promise.all([
            this.prisma.like.count({ where: { recipeId } }),
            requester
                ? this.prisma.like.findUnique({
                      where: { userId_recipeId: { userId: requester.userId, recipeId } },
                      select: { userId: true },
                  })
                : null,
        ]);
        return { likeCount, likedByMe: own !== null };
    }

    // ─── Comments ─────────────────────────────────────────────────────

    async addComment(
        userId: string,
        role: string,
        recipeId: number,
        content: string,
    ): Promise<Comment> {
        await this.recipes.assertReadable(recipeId, { userId, role });
        return this.prisma.comment.create({
            data: { userId, recipeId, content, parentId: null },
            include: commentWithRepliesInclude,
        });
    }

    async replyToComment(
        userId: string,
        role: string,
        parentCommentId: number,
        content: string,
    ): Promise<Comment> {
        const parent = await this.prisma.comment.findUnique({
            where: { id: parentCommentId },
            select: { id: true, recipeId: true },
        });
        if (!parent) {
            throw new NotFoundException(`Comment ${parentCommentId} not found`);
        }
        await this.recipes.assertReadable(parent.recipeId, { userId, role });
        return this.prisma.comment.create({
            data: { userId, recipeId: parent.recipeId, content, parentId: parent.id },
            include: commentWithRepliesInclude,
        });
    }

    async deleteComment(commentId: number, userId: string): Promise<void> {
        const comment = await this.prisma.comment.findUnique({
            where: { id: commentId },
            select: { id: true, userId: true },
        });
        if (!comment) {
            throw new NotFoundException(`Comment ${commentId} not found`);
        }
        if (comment.userId !== userId) {
            throw new ForbiddenException('You can only delete your own comments');
        }
        await this.prisma.comment.delete({ where: { id: commentId } });
    }

    /**
     * Edit your own comment (M5). Author-only — same ownership rule as delete,
     * and like delete it doesn't re-assert recipe readability: you own the row
     * either way, and editing your own comment never reveals a hidden draft.
     * `updatedAt` bumps automatically (@updatedAt); the client shows an "edited"
     * marker when it differs from createdAt.
     */
    async editComment(commentId: number, userId: string, content: string): Promise<Comment> {
        const comment = await this.prisma.comment.findUnique({
            where: { id: commentId },
            select: { id: true, userId: true },
        });
        if (!comment) {
            throw new NotFoundException(`Comment ${commentId} not found`);
        }
        if (comment.userId !== userId) {
            throw new ForbiddenException('You can only edit your own comments');
        }
        return this.prisma.comment.update({
            where: { id: commentId },
            data: { content },
            include: commentWithRepliesInclude,
        });
    }

    /**
     * Returns top-level comments on a recipe with up to two levels of replies,
     * each annotated with author identity. Ordered newest-first.
     */
    async getCommentsByRecipe(recipeId: number, requester: Requester) {
        await this.recipes.assertReadable(recipeId, requester);
        return this.prisma.comment.findMany({
            where: { recipeId, parentId: null },
            include: commentWithRepliesInclude,
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * The "load more replies" step (M5): returns the direct replies of one
     * comment, each carrying two further levels — so a thread of any depth is
     * walked two levels at a time. Draft-aware via the parent comment's recipe
     * (same 404 rule as the recipe read). Oldest-first, matching the listing.
     */
    async getReplies(commentId: number, requester: Requester) {
        const comment = await this.prisma.comment.findUnique({
            where: { id: commentId },
            select: { id: true, recipeId: true },
        });
        if (!comment) {
            throw new NotFoundException(`Comment ${commentId} not found`);
        }
        await this.recipes.assertReadable(comment.recipeId, requester);
        return this.prisma.comment.findMany({
            where: { parentId: commentId },
            include: commentWithRepliesInclude,
            orderBy: { createdAt: 'asc' },
        });
    }
}
