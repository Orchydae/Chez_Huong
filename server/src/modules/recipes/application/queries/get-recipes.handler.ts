import { Inject, Injectable } from '@nestjs/common';
import { RecipePort } from '../../domain/ports/recipe.port';
import { Recipe } from '../../domain/entities/recipe.entity';

@Injectable()
export class GetRecipesHandler {
    constructor(
        @Inject(RecipePort)
        private readonly recipeRepository: RecipePort,
    ) { }

    async execute(): Promise<Recipe[]> {
        return this.recipeRepository.findAll();
    }
}
