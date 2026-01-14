import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AddCommentHandler } from './add-comment.handler';
import { AddCommentCommand } from './add-comment.command';
import { ISocialInteractionRepository } from '../../domain/ports/social-interaction.port';
import { Comment } from '../../domain/entities/comment.entity';

describe('AddCommentHandler', () => {
    let handler: AddCommentHandler;
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
                AddCommentHandler,
                {
                    provide: ISocialInteractionRepository,
                    useValue: mockRepository,
                },
            ],
        }).compile();

        handler = module.get<AddCommentHandler>(AddCommentHandler);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('execute', () => {
        it('should create a top-level comment', async () => {
            const command = new AddCommentCommand('user-123', 1, 'Great recipe!');
            const createdComment = new Comment(
                1,
                'Great recipe!',
                new Date(),
                'user-123',
                1,
            );

            mockRepository.createComment.mockResolvedValue(createdComment);

            const result = await handler.execute(command);

            expect(mockRepository.findComment).not.toHaveBeenCalled();
            expect(mockRepository.createComment).toHaveBeenCalledWith(
                'user-123',
                1,
                'Great recipe!',
                undefined,
            );
            expect(result).toEqual(createdComment);
        });

        it('should create a reply when parentId is provided and parent exists', async () => {
            const parentComment = new Comment(
                1,
                'Original comment',
                new Date(),
                'user-456',
                1,
            );
            const command = new AddCommentCommand('user-123', 1, 'I agree!', 1);
            const replyComment = new Comment(
                2,
                'I agree!',
                new Date(),
                'user-123',
                1,
                1,
            );

            mockRepository.findComment.mockResolvedValue(parentComment);
            mockRepository.createComment.mockResolvedValue(replyComment);

            const result = await handler.execute(command);

            expect(mockRepository.findComment).toHaveBeenCalledWith(1);
            expect(mockRepository.createComment).toHaveBeenCalledWith(
                'user-123',
                1,
                'I agree!',
                1,
            );
            expect(result).toEqual(replyComment);
            expect(result.parentId).toBe(1);
        });

        it('should throw NotFoundException when parent comment does not exist', async () => {
            const command = new AddCommentCommand('user-123', 1, 'Reply to missing', 999);

            mockRepository.findComment.mockResolvedValue(null);

            await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
            await expect(handler.execute(command)).rejects.toThrow(
                'Comment with ID 999 not found',
            );
            expect(mockRepository.createComment).not.toHaveBeenCalled();
        });

        it('should pass through all command properties to repository', async () => {
            const command = new AddCommentCommand('user-xyz', 42, 'Test content', 10);
            const parentComment = new Comment(
                10,
                'Parent',
                new Date(),
                'other-user',
                42,
            );

            mockRepository.findComment.mockResolvedValue(parentComment);
            mockRepository.createComment.mockResolvedValue(
                new Comment(11, 'Test content', new Date(), 'user-xyz', 42, 10),
            );

            await handler.execute(command);

            expect(mockRepository.createComment).toHaveBeenCalledWith(
                'user-xyz',
                42,
                'Test content',
                10,
            );
        });
    });
});
