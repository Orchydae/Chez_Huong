import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AddCommentCommand } from './add-comment.command';
import { Comment } from '../../domain/entities/comment.entity';
import { ISocialInteractionRepository } from '../../domain/ports/social-interaction.port';

@Injectable()
export class AddCommentHandler {
    constructor(
        @Inject(ISocialInteractionRepository)
        private readonly repository: ISocialInteractionRepository,
    ) { }

    async execute(command: AddCommentCommand): Promise<Comment> {
        // If replying to a parent comment, validate parent exists
        if (command.parentId) {
            const parentComment = await this.repository.findComment(command.parentId);
            if (!parentComment) {
                throw new NotFoundException(`Comment with ID ${command.parentId} not found`);
            }
        }

        return this.repository.createComment(
            command.userId,
            command.recipeId,
            command.content,
            command.parentId,
        );
    }
}
