import { Test, TestingModule } from '@nestjs/testing';
import { SocialInteractionService } from './social-interaction.service';
import { LikeRecipeHandler, LikeRecipeResult } from '../commands/like-recipe.handler';
import { AddCommentHandler } from '../commands/add-comment.handler';
import { DeleteCommentHandler } from '../commands/delete-comment.handler';
import { GetRecipeCommentsHandler } from '../queries/get-recipe-comments.handler';
import { ISocialInteractionRepository } from '../../domain/ports/social-interaction.port';
import { Comment } from '../../domain/entities/comment.entity';

describe('SocialInteractionService', () => {
    let service: SocialInteractionService;
    let mockLikeRecipeHandler: jest.Mocked<LikeRecipeHandler>;
    let mockAddCommentHandler: jest.Mocked<AddCommentHandler>;
    let mockDeleteCommentHandler: jest.Mocked<DeleteCommentHandler>;
    let mockGetRecipeCommentsHandler: jest.Mocked<GetRecipeCommentsHandler>;
    let mockRepository: jest.Mocked<ISocialInteractionRepository>;

    beforeEach(async () => {
        mockLikeRecipeHandler = {
            execute: jest.fn(),
        } as any;

        mockAddCommentHandler = {
            execute: jest.fn(),
        } as any;

        mockDeleteCommentHandler = {
            execute: jest.fn(),
        } as any;

        mockGetRecipeCommentsHandler = {
            execute: jest.fn(),
        } as any;

        mockRepository = {
            findLike: jest.fn(),
            createLike: jest.fn(),
            deleteLike: jest.fn(),
            getLikeCount: jest.fn(),
            findComment: jest.fn(),
            createComment: jest.fn(),
            deleteComment: jest.fn(),
            getCommentsByRecipe: jest.fn(),
            getReplies: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SocialInteractionService,
                { provide: LikeRecipeHandler, useValue: mockLikeRecipeHandler },
                { provide: AddCommentHandler, useValue: mockAddCommentHandler },
                { provide: DeleteCommentHandler, useValue: mockDeleteCommentHandler },
                { provide: GetRecipeCommentsHandler, useValue: mockGetRecipeCommentsHandler },
                { provide: ISocialInteractionRepository, useValue: mockRepository },
            ],
        }).compile();

        service = module.get<SocialInteractionService>(SocialInteractionService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('toggleLike', () => {
        it('should delegate to LikeRecipeHandler and return result', async () => {
            const expectedResult: LikeRecipeResult = { liked: true, likeCount: 5 };
            mockLikeRecipeHandler.execute.mockResolvedValue(expectedResult);

            const result = await service.toggleLike('user-123', 1);

            expect(mockLikeRecipeHandler.execute).toHaveBeenCalledWith(
                expect.objectContaining({ userId: 'user-123', recipeId: 1 }),
            );
            expect(result).toEqual(expectedResult);
        });
    });

    describe('getLikeCount', () => {
        it('should return like count from repository', async () => {
            mockRepository.getLikeCount.mockResolvedValue(10);

            const result = await service.getLikeCount(1);

            expect(mockRepository.getLikeCount).toHaveBeenCalledWith(1);
            expect(result).toEqual({ likeCount: 10 });
        });

        it('should return zero when no likes', async () => {
            mockRepository.getLikeCount.mockResolvedValue(0);

            const result = await service.getLikeCount(999);

            expect(result).toEqual({ likeCount: 0 });
        });
    });

    describe('addComment', () => {
        it('should delegate to AddCommentHandler', async () => {
            const expectedComment = new Comment(1, 'Test', new Date(), 'user-123', 1);
            mockAddCommentHandler.execute.mockResolvedValue(expectedComment);

            const result = await service.addComment('user-123', 1, 'Test');

            expect(mockAddCommentHandler.execute).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'user-123',
                    recipeId: 1,
                    content: 'Test',
                }),
            );
            expect(result).toEqual(expectedComment);
        });
    });

    describe('replyToComment', () => {
        it('should find parent comment and create reply', async () => {
            const parentComment = new Comment(1, 'Parent', new Date(), 'user-1', 100);
            const replyComment = new Comment(2, 'Reply', new Date(), 'user-123', 100, 1);

            mockRepository.findComment.mockResolvedValue(parentComment);
            mockAddCommentHandler.execute.mockResolvedValue(replyComment);

            const result = await service.replyToComment('user-123', 1, 'Reply');

            expect(mockRepository.findComment).toHaveBeenCalledWith(1);
            expect(mockAddCommentHandler.execute).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'user-123',
                    recipeId: 100, // From parent comment
                    content: 'Reply',
                    parentId: 1,
                }),
            );
            expect(result).toEqual(replyComment);
        });

        it('should throw error when parent comment not found', async () => {
            mockRepository.findComment.mockResolvedValue(null);

            await expect(service.replyToComment('user-123', 999, 'Reply')).rejects.toThrow(
                'Comment with ID 999 not found',
            );
            expect(mockAddCommentHandler.execute).not.toHaveBeenCalled();
        });
    });

    describe('deleteComment', () => {
        it('should delegate to DeleteCommentHandler', async () => {
            mockDeleteCommentHandler.execute.mockResolvedValue();

            await service.deleteComment(1, 'user-123');

            expect(mockDeleteCommentHandler.execute).toHaveBeenCalledWith(
                expect.objectContaining({
                    commentId: 1,
                    userId: 'user-123',
                }),
            );
        });
    });

    describe('getCommentsByRecipe', () => {
        it('should delegate to GetRecipeCommentsHandler', async () => {
            const comments = [new Comment(1, 'Test', new Date(), 'user-1', 1)];
            mockGetRecipeCommentsHandler.execute.mockResolvedValue(comments);

            const result = await service.getCommentsByRecipe(1);

            expect(mockGetRecipeCommentsHandler.execute).toHaveBeenCalledWith(1);
            expect(result).toEqual(comments);
        });

        it('should return empty array when no comments', async () => {
            mockGetRecipeCommentsHandler.execute.mockResolvedValue([]);

            const result = await service.getCommentsByRecipe(999);

            expect(result).toEqual([]);
        });
    });
});
