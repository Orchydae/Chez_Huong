import { Inject, Injectable } from '@nestjs/common';
import { RecipeRepository } from '../../domain/ports/recipe.port';
import { Recipe } from '../../domain/entities/recipe.entity';

@Injectable()
export class GetRecipesHandler {
    constructor(
        @Inject(RecipeRepository)
        private readonly recipeRepository: RecipeRepository,
    ) { }

    async execute(): Promise<Recipe[]> {
        return this.recipeRepository.findAll();
    }
}
