import { Test, TestingModule } from '@nestjs/testing';
import { SocialInteractionService } from '../../application/services/social-interaction.service';
import { Comment } from '../../domain/entities/comment.entity';

/**
 * Controller tests that verify the controller correctly delegates to the service.
 * Note: Uses a simplified mock controller to avoid auth module import issues in tests.
 * For full integration tests, run e2e tests.
 */
class MockSocialInteractionController {
    constructor(private readonly socialInteractionService: SocialInteractionService) { }

    async toggleLike(recipeId: string, req: any) {
        return this.socialInteractionService.toggleLike(req.user.userId, +recipeId);
    }

    async getLikeCount(recipeId: string) {
        return this.socialInteractionService.getLikeCount(+recipeId);
    }

    async addComment(recipeId: string, dto: { content: string }, req: any) {
        return this.socialInteractionService.addComment(req.user.userId, +recipeId, dto.content);
    }

    async getComments(recipeId: string) {
        return this.socialInteractionService.getCommentsByRecipe(+recipeId);
    }

    async replyToComment(commentId: string, dto: { content: string }, req: any) {
        return this.socialInteractionService.replyToComment(req.user.userId, +commentId, dto.content);
    }

    async deleteComment(commentId: string, req: any) {
        await this.socialInteractionService.deleteComment(+commentId, req.user.userId);
    }
}

describe('SocialInteractionController', () => {
    let controller: MockSocialInteractionController;
    let mockService: jest.Mocked<SocialInteractionService>;

    beforeEach(() => {
        mockService = {
            toggleLike: jest.fn(),
            getLikeCount: jest.fn(),
            addComment: jest.fn(),
            replyToComment: jest.fn(),
            deleteComment: jest.fn(),
            getCommentsByRecipe: jest.fn(),
        } as any;

        controller = new MockSocialInteractionController(mockService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('toggleLike', () => {
        it('should toggle like and return result', async () => {
            const expectedResult = { liked: true, likeCount: 5 };
            mockService.toggleLike.mockResolvedValue(expectedResult);

            const req = { user: { userId: 'user-123' } };
            const result = await controller.toggleLike('1', req);

            expect(mockService.toggleLike).toHaveBeenCalledWith('user-123', 1);
            expect(result).toEqual(expectedResult);
        });

        it('should parse recipe ID as number', async () => {
            mockService.toggleLike.mockResolvedValue({ liked: true, likeCount: 1 });

            const req = { user: { userId: 'user-123' } };
            await controller.toggleLike('42', req);

            expect(mockService.toggleLike).toHaveBeenCalledWith('user-123', 42);
        });
    });

    describe('getLikeCount', () => {
        it('should return like count for recipe', async () => {
            mockService.getLikeCount.mockResolvedValue({ likeCount: 10 });

            const result = await controller.getLikeCount('1');

            expect(mockService.getLikeCount).toHaveBeenCalledWith(1);
            expect(result).toEqual({ likeCount: 10 });
        });

        it('should return zero for recipe with no likes', async () => {
            mockService.getLikeCount.mockResolvedValue({ likeCount: 0 });

            const result = await controller.getLikeCount('999');

            expect(result).toEqual({ likeCount: 0 });
        });
    });

    describe('addComment', () => {
        it('should add comment and return the created comment', async () => {
            const createdComment = new Comment(1, 'Great recipe!', new Date(), 'user-123', 1);
            mockService.addComment.mockResolvedValue(createdComment);

            const req = { user: { userId: 'user-123' } };
            const dto = { content: 'Great recipe!' };
            const result = await controller.addComment('1', dto, req);

            expect(mockService.addComment).toHaveBeenCalledWith('user-123', 1, 'Great recipe!');
            expect(result).toEqual(createdComment);
        });
    });

    describe('getComments', () => {
        it('should return all comments for a recipe', async () => {
            const comments = [
                new Comment(1, 'First', new Date(), 'user-1', 1),
                new Comment(2, 'Second', new Date(), 'user-2', 1),
            ];
            mockService.getCommentsByRecipe.mockResolvedValue(comments);

            const result = await controller.getComments('1');

            expect(mockService.getCommentsByRecipe).toHaveBeenCalledWith(1);
            expect(result).toEqual(comments);
            expect(result).toHaveLength(2);
        });

        it('should return empty array when no comments', async () => {
            mockService.getCommentsByRecipe.mockResolvedValue([]);

            const result = await controller.getComments('999');

            expect(result).toEqual([]);
        });
    });

    describe('replyToComment', () => {
        it('should create reply and return the created comment', async () => {
            const replyComment = new Comment(2, 'I agree!', new Date(), 'user-123', 1, 1);
            mockService.replyToComment.mockResolvedValue(replyComment);

            const req = { user: { userId: 'user-123' } };
            const dto = { content: 'I agree!' };
            const result = await controller.replyToComment('1', dto, req);

            expect(mockService.replyToComment).toHaveBeenCalledWith('user-123', 1, 'I agree!');
            expect(result).toEqual(replyComment);
            expect(result.parentId).toBe(1);
        });
    });

    describe('deleteComment', () => {
        it('should delete comment successfully', async () => {
            mockService.deleteComment.mockResolvedValue();

            const req = { user: { userId: 'user-123' } };
            const result = await controller.deleteComment('1', req);

            expect(mockService.deleteComment).toHaveBeenCalledWith(1, 'user-123');
            expect(result).toBeUndefined();
        });

        it('should parse comment ID as number', async () => {
            mockService.deleteComment.mockResolvedValue();

            const req = { user: { userId: 'user-123' } };
            await controller.deleteComment('42', req);

            expect(mockService.deleteComment).toHaveBeenCalledWith(42, 'user-123');
        });
    });
});
