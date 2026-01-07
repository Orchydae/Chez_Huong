import { Injectable } from '@nestjs/common';
import { CreateRecipeCommand } from '../commands/create-recipe.command';
import { CreateRecipeHandler } from '../commands/create-recipe.handler';
import { GetRecipesHandler } from '../queries/get-recipes.handler';
import { GetRecipeHandler } from '../queries/get-recipe.handler';
import { Recipe } from '../../domain/entities/recipe.entity';

@Injectable()
export class RecipesService {
    constructor(
        private readonly createRecipeHandler: CreateRecipeHandler,
        private readonly getRecipesHandler: GetRecipesHandler,
        private readonly getRecipeHandler: GetRecipeHandler,
    ) { }

    create(command: CreateRecipeCommand): Promise<Recipe> {
        return this.createRecipeHandler.execute(command);
    }

    findAll(): Promise<Recipe[]> {
        return this.getRecipesHandler.execute();
    }

    findOne(id: number): Promise<Recipe | null> {
        return this.getRecipeHandler.execute(id);
    }
}
