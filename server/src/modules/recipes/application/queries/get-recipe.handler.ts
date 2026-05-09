import { Inject, Injectable } from '@nestjs/common';
import { IRecipesRepository } from '../../domain/ports/recipe.port';
import { Recipe } from '../../domain/entities/recipe.entity';

@Injectable()
export class GetRecipeHandler {
    constructor(
        @Inject(IRecipesRepository)
        private readonly recipeRepository: IRecipesRepository,
    ) { }

    async execute(id: number): Promise<Recipe | null> {
        return this.recipeRepository.findById(id);
    }
}
