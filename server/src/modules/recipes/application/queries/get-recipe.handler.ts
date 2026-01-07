import { Inject, Injectable } from '@nestjs/common';
import { RecipePort } from '../../domain/ports/recipe.port';
import { Recipe } from '../../domain/entities/recipe.entity';

@Injectable()
export class GetRecipeHandler {
    constructor(
        @Inject(RecipePort)
        private readonly recipeRepository: RecipePort,
    ) { }

    async execute(id: number): Promise<Recipe | null> {
        return this.recipeRepository.findById(id);
    }
}
