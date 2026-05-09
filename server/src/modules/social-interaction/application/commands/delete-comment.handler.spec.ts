import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { DeleteCommentHandler } from './delete-comment.handler';
import { DeleteCommentCommand } from './delete-comment.command';
import { ISocialInteractionRepository } from '../../domain/ports/social-interaction.port';
import { Comment } from '../../domain/entities/comment.entity';

describe('DeleteCommentHandler', () => {
    let handler: DeleteCommentHandler;
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
                DeleteCommentHandler,
                {
                    provide: ISocialInteractionRepository,
                    useValue: mockRepository,
                },
            ],
        }).compile();

        handler = module.get<DeleteCommentHandler>(DeleteCommentHandler);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('execute', () => {
        it('should delete comment when user is the owner', async () => {
            const command = new DeleteCommentCommand(1, 'user-123');
            const existingComment = new Comment(
                1,
                'My comment',
                new Date(),
                'user-123',
                100,
            );

            mockRepository.findComment.mockResolvedValue(existingComment);

            await handler.execute(command);

            expect(mockRepository.findComment).toHaveBeenCalledWith(1);
            expect(mockRepository.deleteComment).toHaveBeenCalledWith(1);
        });

        it('should throw NotFoundException when comment does not exist', async () => {
            const command = new DeleteCommentCommand(999, 'user-123');

            mockRepository.findComment.mockResolvedValue(null);

            await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
            await expect(handler.execute(command)).rejects.toThrow(
                'Comment with ID 999 not found',
            );
            expect(mockRepository.deleteComment).not.toHaveBeenCalled();
        });

        it('should throw ForbiddenException when user is not the owner', async () => {
            const command = new DeleteCommentCommand(1, 'other-user');
            const existingComment = new Comment(
                1,
                'Someone else comment',
                new Date(),
                'user-123', // Original owner
                100,
            );

            mockRepository.findComment.mockResolvedValue(existingComment);

            await expect(handler.execute(command)).rejects.toThrow(ForbiddenException);
            await expect(handler.execute(command)).rejects.toThrow(
                'You can only delete your own comments',
            );
            expect(mockRepository.deleteComment).not.toHaveBeenCalled();
        });

        it('should return void on successful deletion', async () => {
            const command = new DeleteCommentCommand(5, 'user-owner');
            const existingComment = new Comment(
                5,
                'Test comment',
                new Date(),
                'user-owner',
                50,
            );

            mockRepository.findComment.mockResolvedValue(existingComment);
            mockRepository.deleteComment.mockResolvedValue();

            const result = await handler.execute(command);

            expect(result).toBeUndefined();
        });

        it('should check ownership correctly with different user IDs', async () => {
            const existingComment = new Comment(
                1,
                'Comment',
                new Date(),
                'user-abc',
                100,
            );
            mockRepository.findComment.mockResolvedValue(existingComment);

            // Owner can delete
            const ownerCommand = new DeleteCommentCommand(1, 'user-abc');
            await expect(handler.execute(ownerCommand)).resolves.toBeUndefined();

            // Non-owner cannot delete
            mockRepository.findComment.mockResolvedValue(existingComment);
            const nonOwnerCommand = new DeleteCommentCommand(1, 'user-xyz');
            await expect(handler.execute(nonOwnerCommand)).rejects.toThrow(ForbiddenException);
        });
    });
});
