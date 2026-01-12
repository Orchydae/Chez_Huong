import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DeleteCommentCommand } from './delete-comment.command';
import { ISocialInteractionRepository } from '../../domain/ports/social-interaction.port';

@Injectable()
export class DeleteCommentHandler {
    constructor(
        @Inject(ISocialInteractionRepository)
        private readonly repository: ISocialInteractionRepository,
    ) { }

    async execute(command: DeleteCommentCommand): Promise<void> {
        const comment = await this.repository.findComment(command.commentId);

        if (!comment) {
            throw new NotFoundException(`Comment with ID ${command.commentId} not found`);
        }

        // Only the comment owner can delete their comment
        if (comment.userId !== command.userId) {
            throw new ForbiddenException('You can only delete your own comments');
        }

        await this.repository.deleteComment(command.commentId);
    }
}
