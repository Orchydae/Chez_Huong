import { Inject, Injectable } from '@nestjs/common';
import { RecipeRepository } from '../../domain/recipe.repository';
import { Recipe } from '../../domain/recipe.entity';

@Injectable()
export class GetRecipeHandler {
    constructor(
        @Inject(RecipeRepository)
        private readonly recipeRepository: RecipeRepository,
    ) { }

    async execute(id: number): Promise<Recipe | null> {
        return this.recipeRepository.findById(id);
    }
}
