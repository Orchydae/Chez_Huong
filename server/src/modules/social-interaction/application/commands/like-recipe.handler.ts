import { Inject, Injectable } from '@nestjs/common';
import { LikeRecipeCommand } from './like-recipe.command';
import { ISocialInteractionRepository } from '../../domain/ports/social-interaction.port';

export interface LikeRecipeResult {
    liked: boolean;
    likeCount: number;
}

@Injectable()
export class LikeRecipeHandler {
    constructor(
        @Inject(ISocialInteractionRepository)
        private readonly repository: ISocialInteractionRepository,
    ) { }

    async execute(command: LikeRecipeCommand): Promise<LikeRecipeResult> {
        const existingLike = await this.repository.findLike(command.userId, command.recipeId);

        if (existingLike) {
            // Unlike: remove the existing like
            await this.repository.deleteLike(command.userId, command.recipeId);
        } else {
            // Like: create a new like
            await this.repository.createLike(command.userId, command.recipeId);
        }

        const likeCount = await this.repository.getLikeCount(command.recipeId);

        return {
            liked: !existingLike,
            likeCount,
        };
    }
}
