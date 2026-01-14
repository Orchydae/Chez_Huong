import { Test, TestingModule } from '@nestjs/testing';
import { LikeRecipeHandler, LikeRecipeResult } from './like-recipe.handler';
import { LikeRecipeCommand } from './like-recipe.command';
import { ISocialInteractionRepository } from '../../domain/ports/social-interaction.port';
import { Like } from '../../domain/entities/like.entity';

describe('LikeRecipeHandler', () => {
    let handler: LikeRecipeHandler;
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
                LikeRecipeHandler,
                {
                    provide: ISocialInteractionRepository,
                    useValue: mockRepository,
                },
            ],
        }).compile();

        handler = module.get<LikeRecipeHandler>(LikeRecipeHandler);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('execute', () => {
        it('should create a like when user has not liked the recipe', async () => {
            const command = new LikeRecipeCommand('user-123', 1);

            mockRepository.findLike.mockResolvedValue(null);
            mockRepository.createLike.mockResolvedValue(new Like('user-123', 1));
            mockRepository.getLikeCount.mockResolvedValue(5);

            const result = await handler.execute(command);

            expect(mockRepository.findLike).toHaveBeenCalledWith('user-123', 1);
            expect(mockRepository.createLike).toHaveBeenCalledWith('user-123', 1);
            expect(mockRepository.deleteLike).not.toHaveBeenCalled();
            expect(mockRepository.getLikeCount).toHaveBeenCalledWith(1);
            expect(result).toEqual({ liked: true, likeCount: 5 });
        });

        it('should remove a like when user has already liked the recipe', async () => {
            const command = new LikeRecipeCommand('user-123', 1);
            const existingLike = new Like('user-123', 1);

            mockRepository.findLike.mockResolvedValue(existingLike);
            mockRepository.getLikeCount.mockResolvedValue(4);

            const result = await handler.execute(command);

            expect(mockRepository.findLike).toHaveBeenCalledWith('user-123', 1);
            expect(mockRepository.deleteLike).toHaveBeenCalledWith('user-123', 1);
            expect(mockRepository.createLike).not.toHaveBeenCalled();
            expect(mockRepository.getLikeCount).toHaveBeenCalledWith(1);
            expect(result).toEqual({ liked: false, likeCount: 4 });
        });

        it('should return correct like count after toggle', async () => {
            const command = new LikeRecipeCommand('user-456', 100);

            mockRepository.findLike.mockResolvedValue(null);
            mockRepository.createLike.mockResolvedValue(new Like('user-456', 100));
            mockRepository.getLikeCount.mockResolvedValue(1);

            const result = await handler.execute(command);

            expect(result.likeCount).toBe(1);
            expect(result.liked).toBe(true);
        });

        it('should handle toggling like result correctly', async () => {
            const command = new LikeRecipeCommand('user-789', 50);

            // First call - no existing like
            mockRepository.findLike.mockResolvedValueOnce(null);
            mockRepository.createLike.mockResolvedValue(new Like('user-789', 50));
            mockRepository.getLikeCount.mockResolvedValueOnce(10);

            const firstResult = await handler.execute(command);
            expect(firstResult.liked).toBe(true);

            // Second call - existing like
            mockRepository.findLike.mockResolvedValueOnce(new Like('user-789', 50));
            mockRepository.getLikeCount.mockResolvedValueOnce(9);

            const secondResult = await handler.execute(command);
            expect(secondResult.liked).toBe(false);
        });
    });
});
