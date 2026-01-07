import { Inject, Injectable } from '@nestjs/common';
import { RecipeRepository } from '../../domain/ports/recipe.port';
import { Recipe } from '../../domain/entities/recipe.entity';

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
