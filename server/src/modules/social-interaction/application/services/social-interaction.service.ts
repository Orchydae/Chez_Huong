import { Inject, Injectable } from '@nestjs/common';
import { LikeRecipeCommand } from '../commands/like-recipe.command';
import { LikeRecipeHandler, LikeRecipeResult } from '../commands/like-recipe.handler';
import { AddCommentCommand } from '../commands/add-comment.command';
import { AddCommentHandler } from '../commands/add-comment.handler';
import { DeleteCommentCommand } from '../commands/delete-comment.command';
import { DeleteCommentHandler } from '../commands/delete-comment.handler';
import { GetRecipeCommentsHandler } from '../queries/get-recipe-comments.handler';
import { Comment } from '../../domain/entities/comment.entity';
import { ISocialInteractionRepository } from '../../domain/ports/social-interaction.port';

@Injectable()
export class SocialInteractionService {
    constructor(
        private readonly likeRecipeHandler: LikeRecipeHandler,
        private readonly addCommentHandler: AddCommentHandler,
        private readonly deleteCommentHandler: DeleteCommentHandler,
        private readonly getRecipeCommentsHandler: GetRecipeCommentsHandler,
        @Inject(ISocialInteractionRepository)
        private readonly repository: ISocialInteractionRepository,
    ) { }

    async toggleLike(userId: string, recipeId: number): Promise<LikeRecipeResult> {
        const command = new LikeRecipeCommand(userId, recipeId);
        return this.likeRecipeHandler.execute(command);
    }

    async getLikeCount(recipeId: number): Promise<{ likeCount: number }> {
        const likeCount = await this.repository.getLikeCount(recipeId);
        return { likeCount };
    }

    async addComment(userId: string, recipeId: number, content: string): Promise<Comment> {
        const command = new AddCommentCommand(userId, recipeId, content);
        return this.addCommentHandler.execute(command);
    }

    async replyToComment(userId: string, parentCommentId: number, content: string): Promise<Comment> {
        // Get the parent comment to find the recipeId
        const parentComment = await this.repository.findComment(parentCommentId);
        if (!parentComment) {
            throw new Error(`Comment with ID ${parentCommentId} not found`);
        }

        const command = new AddCommentCommand(userId, parentComment.recipeId, content, parentCommentId);
        return this.addCommentHandler.execute(command);
    }

    async deleteComment(commentId: number, userId: string): Promise<void> {
        const command = new DeleteCommentCommand(commentId, userId);
        return this.deleteCommentHandler.execute(command);
    }

    async getCommentsByRecipe(recipeId: number): Promise<Comment[]> {
        return this.getRecipeCommentsHandler.execute(recipeId);
    }
}
