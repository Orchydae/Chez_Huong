import { Inject, Injectable } from '@nestjs/common';
import { RecipeRepository } from '../../domain/recipe.repository';
import { Recipe } from '../../domain/recipe.entity';

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
