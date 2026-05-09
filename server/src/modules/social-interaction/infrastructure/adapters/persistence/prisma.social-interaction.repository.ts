import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ISocialInteractionRepository } from '../../../domain/ports/social-interaction.port';
import { Like } from '../../../domain/entities/like.entity';
import { Comment } from '../../../domain/entities/comment.entity';

@Injectable()
export class PrismaSocialInteractionRepository implements ISocialInteractionRepository {
    constructor(private readonly prisma: PrismaService) { }

    // Like operations
    async findLike(userId: string, recipeId: number): Promise<Like | null> {
        const like = await this.prisma.like.findUnique({
            where: {
                userId_recipeId: { userId, recipeId }
            }
        });

        if (!like) return null;
        return new Like(like.userId, like.recipeId);
    }

    async createLike(userId: string, recipeId: number): Promise<Like> {
        const like = await this.prisma.like.create({
            data: { userId, recipeId }
        });
        return new Like(like.userId, like.recipeId);
    }

    async deleteLike(userId: string, recipeId: number): Promise<void> {
        await this.prisma.like.delete({
            where: {
                userId_recipeId: { userId, recipeId }
            }
        });
    }

    async getLikeCount(recipeId: number): Promise<number> {
        return this.prisma.like.count({
            where: { recipeId }
        });
    }

    // Comment operations
    async findComment(id: number): Promise<Comment | null> {
        const comment = await this.prisma.comment.findUnique({
            where: { id }
        });

        if (!comment) return null;
        return new Comment(
            comment.id,
            comment.content,
            comment.createdAt,
            comment.userId,
            comment.recipeId,
            comment.parentId,
            []
        );
    }

    async createComment(userId: string, recipeId: number, content: string, parentId?: number): Promise<Comment> {
        const comment = await this.prisma.comment.create({
            data: {
                userId,
                recipeId,
                content,
                parentId: parentId || null,
            }
        });

        return new Comment(
            comment.id,
            comment.content,
            comment.createdAt,
            comment.userId,
            comment.recipeId,
            comment.parentId,
            []
        );
    }

    async deleteComment(id: number): Promise<void> {
        await this.prisma.comment.delete({
            where: { id }
        });
    }

    async getCommentsByRecipe(recipeId: number): Promise<Comment[]> {
        // Get top-level comments (no parent) with nested replies
        const comments = await this.prisma.comment.findMany({
            where: {
                recipeId,
                parentId: null, // Only top-level comments
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    }
                },
                replies: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                            }
                        },
                        replies: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        firstName: true,
                                        lastName: true,
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return comments.map(comment => this.mapToEntity(comment));
    }

    async getReplies(commentId: number): Promise<Comment[]> {
        const replies = await this.prisma.comment.findMany({
            where: { parentId: commentId },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        return replies.map(reply => new Comment(
            reply.id,
            reply.content,
            reply.createdAt,
            reply.userId,
            reply.recipeId,
            reply.parentId,
            []
        ));
    }

    private mapToEntity(comment: any): Comment {
        const replies = comment.replies?.map((reply: any) => this.mapToEntity(reply)) || [];

        return new Comment(
            comment.id,
            comment.content,
            comment.createdAt,
            comment.userId,
            comment.recipeId,
            comment.parentId,
            replies
        );
    }
}
