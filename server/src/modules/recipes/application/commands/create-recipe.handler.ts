import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateRecipeCommand } from './create-recipe.command';
import { RecipeRepository } from '../../domain/recipe.repository';
import { Recipe } from '../../domain/recipe.entity';
import type { IngredientsPort } from '../../domain/ports/ingredients.port';

@Injectable()
export class CreateRecipeHandler {
    constructor(
        @Inject(RecipeRepository)
        private readonly recipeRepository: RecipeRepository,
        @Inject('IngredientsPort')
        private readonly ingredientsPort: IngredientsPort,
    ) { }

    async execute(command: CreateRecipeCommand): Promise<Recipe> {
        // Validation: Extract all ingredient IDs from all sections
        const allIngredientIds = command.ingredientSections.flatMap(
            section => section.ingredients.map(ri => ri.ingredientId)
        );

        // Check if all ingredients exist
        const missingIngredients = await this.ingredientsPort.findMissingIngredients(allIngredientIds);

        if (missingIngredients.length > 0) {
            throw new BadRequestException(
                `The following ingredient IDs do not exist: ${missingIngredients.join(', ')}`
            );
        }

        // Create the recipe entity
        const recipe = new Recipe(
            0,
            command.title,
            command.description,
            command.prepTime,
            command.cookTime,
            command.difficulty,
            command.type,
            command.cuisine,
            command.servings,
            command.authorId,
            command.nutritionalInfo
        );


        // Save recipe with ingredient sections
        // Note: Repository needs to be updated to handle ingredient sections
        return this.recipeRepository.save(recipe, command.ingredientSections);
    }
}
