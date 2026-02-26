import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateRecipeCommand } from './create-recipe.command';
import { IRecipesRepository } from '../../domain/ports/recipe.port';
import {
    Recipe,
    EmptyIngredientSectionsError,
    EmptyIngredientsError,
    EmptyStepSectionsError,
    EmptyStepsError,
} from '../../domain/entities/recipe.entity';
import { IIngredientsRepository } from '../../domain/ports/ingredients.port';

@Injectable()
export class CreateRecipeHandler {
    constructor(
        @Inject(IRecipesRepository)
        private readonly recipeRepository: IRecipesRepository,
        @Inject(IIngredientsRepository)
        private readonly ingredientsRepository: IIngredientsRepository,
    ) { }

    async execute(command: CreateRecipeCommand): Promise<Recipe> {
        // Validation: Extract all ingredient IDs from all sections
        const allIngredientIds = command.ingredientSections.flatMap(
            section => section.ingredients.map(ri => ri.ingredientId)
        );

        // Check if all ingredients exist in the database
        const missingIngredients = await this.ingredientsRepository.findMissingIngredients(allIngredientIds);

        if (missingIngredients.length > 0) {
            throw new BadRequestException(
                `The following ingredient IDs do not exist: ${missingIngredients.join(', ')}`
            );
        }

        // Create the recipe entity using the factory method (includes domain validation)
        try {
            const recipe = Recipe.create(
                command.title,
                command.title_fr || null,
                command.description,
                command.description_fr || null,
                command.prepTime,
                command.prepTimeUnit,
                command.cookTime,
                command.cookTimeUnit,
                command.difficulty,
                command.type,
                command.cuisine,
                command.servings,
                command.authorId,
                command.ingredientSections,
                command.stepSections,
                command.particularities,
            );

            // Save and return the recipe
            return this.recipeRepository.save(recipe);
        } catch (error) {
            // Convert domain validation errors to HTTP-friendly errors
            if (
                error instanceof EmptyIngredientSectionsError ||
                error instanceof EmptyIngredientsError ||
                error instanceof EmptyStepSectionsError ||
                error instanceof EmptyStepsError
            ) {
                throw new BadRequestException(error.message);
            }
            throw error;
        }
    }
}
