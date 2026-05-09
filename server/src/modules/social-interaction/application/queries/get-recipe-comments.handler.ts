import { Inject, Injectable } from '@nestjs/common';
import { Comment } from '../../domain/entities/comment.entity';
import { ISocialInteractionRepository } from '../../domain/ports/social-interaction.port';

@Injectable()
export class GetRecipeCommentsHandler {
    constructor(
        @Inject(ISocialInteractionRepository)
        private readonly repository: ISocialInteractionRepository,
    ) { }

    async execute(recipeId: number): Promise<Comment[]> {
        return this.repository.getCommentsByRecipe(recipeId);
    }
}
