import { Like } from '../entities/like.entity';
import { Comment } from '../entities/comment.entity';

export const ISocialInteractionRepository = Symbol('ISocialInteractionRepository');

export interface ISocialInteractionRepository {
    // Like operations
    findLike(userId: string, recipeId: number): Promise<Like | null>;
    createLike(userId: string, recipeId: number): Promise<Like>;
    deleteLike(userId: string, recipeId: number): Promise<void>;
    getLikeCount(recipeId: number): Promise<number>;

    // Comment operations
    findComment(id: number): Promise<Comment | null>;
    createComment(userId: string, recipeId: number, content: string, parentId?: number): Promise<Comment>;
    deleteComment(id: number): Promise<void>;
    getCommentsByRecipe(recipeId: number): Promise<Comment[]>;
    getReplies(commentId: number): Promise<Comment[]>;
}
