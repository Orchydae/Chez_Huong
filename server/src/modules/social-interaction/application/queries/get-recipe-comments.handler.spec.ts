import { Test, TestingModule } from '@nestjs/testing';
import { GetRecipeCommentsHandler } from './get-recipe-comments.handler';
import { ISocialInteractionRepository } from '../../domain/ports/social-interaction.port';
import { Comment } from '../../domain/entities/comment.entity';

describe('GetRecipeCommentsHandler', () => {
    let handler: GetRecipeCommentsHandler;
    let mockRepository: jest.Mocked<ISocialInteractionRepository>;

    beforeEach(async () => {
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
                GetRecipeCommentsHandler,
                {
                    provide: ISocialInteractionRepository,
                    useValue: mockRepository,
                },
            ],
        }).compile();

        handler = module.get<GetRecipeCommentsHandler>(GetRecipeCommentsHandler);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('execute', () => {
        it('should return comments for a recipe', async () => {
            const recipeId = 1;
            const comments = [
                new Comment(1, 'First comment', new Date(), 'user-1', recipeId),
                new Comment(2, 'Second comment', new Date(), 'user-2', recipeId),
            ];

            mockRepository.getCommentsByRecipe.mockResolvedValue(comments);

            const result = await handler.execute(recipeId);

            expect(mockRepository.getCommentsByRecipe).toHaveBeenCalledWith(recipeId);
            expect(result).toEqual(comments);
            expect(result).toHaveLength(2);
        });

        it('should return empty array when no comments exist', async () => {
            const recipeId = 999;

            mockRepository.getCommentsByRecipe.mockResolvedValue([]);

            const result = await handler.execute(recipeId);

            expect(mockRepository.getCommentsByRecipe).toHaveBeenCalledWith(recipeId);
            expect(result).toEqual([]);
        });

        it('should return comments with nested replies', async () => {
            const recipeId = 1;
            const reply = new Comment(2, 'Reply', new Date(), 'user-2', recipeId, 1);
            const parentComment = new Comment(
                1,
                'Parent comment',
                new Date(),
                'user-1',
                recipeId,
                null,
                [reply],
            );

            mockRepository.getCommentsByRecipe.mockResolvedValue([parentComment]);

            const result = await handler.execute(recipeId);

            expect(result).toHaveLength(1);
            expect(result[0].replies).toHaveLength(1);
            expect(result[0].replies[0].content).toBe('Reply');
        });

        it('should pass recipeId correctly to repository', async () => {
            const recipeId = 42;
            mockRepository.getCommentsByRecipe.mockResolvedValue([]);

            await handler.execute(recipeId);

            expect(mockRepository.getCommentsByRecipe).toHaveBeenCalledWith(42);
        });
    });
});
