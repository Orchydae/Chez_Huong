import { Injectable } from '@nestjs/common';
import { CreateRecipeCommand } from '../commands/create-recipe.command';
import { CreateRecipeHandler } from '../commands/create-recipe.handler';
import { UpdateRecipeCommand } from '../commands/update-recipe.command';
import { UpdateRecipeHandler } from '../commands/update-recipe.handler';
import { GetRecipesHandler } from '../queries/get-recipes.handler';
import { GetRecipeHandler } from '../queries/get-recipe.handler';
import { Recipe } from '../../domain/entities/recipe.entity';

@Injectable()
export class RecipesService {
    constructor(
        private readonly createRecipeHandler: CreateRecipeHandler,
        private readonly updateRecipeHandler: UpdateRecipeHandler,
        private readonly getRecipesHandler: GetRecipesHandler,
        private readonly getRecipeHandler: GetRecipeHandler,
    ) { }

    create(command: CreateRecipeCommand): Promise<Recipe> {
        return this.createRecipeHandler.execute(command);
    }

    update(command: UpdateRecipeCommand): Promise<Recipe> {
        return this.updateRecipeHandler.execute(command);
    }

    findAll(): Promise<Recipe[]> {
        return this.getRecipesHandler.execute();
    }

    findOne(id: number): Promise<Recipe | null> {
        return this.getRecipeHandler.execute(id);
    }
}
