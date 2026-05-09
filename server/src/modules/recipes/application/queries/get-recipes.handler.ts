import { Inject, Injectable } from '@nestjs/common';
import { IRecipesRepository } from '../../domain/ports/recipe.port';
import { Recipe } from '../../domain/entities/recipe.entity';

@Injectable()
export class GetRecipesHandler {
    constructor(
        @Inject(IRecipesRepository)
        private readonly recipeRepository: IRecipesRepository,
    ) { }

    async execute(): Promise<Recipe[]> {
        return this.recipeRepository.findAll();
    }
}
