import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UpdateRecipeCommand } from './update-recipe.command';
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
export class UpdateRecipeHandler {
    constructor(
        @Inject(IRecipesRepository)
        private readonly recipeRepository: IRecipesRepository,
        @Inject(IIngredientsRepository)
        private readonly ingredientsRepository: IIngredientsRepository,
    ) { }

    async execute(command: UpdateRecipeCommand): Promise<Recipe> {
        // Check if recipe exists
        const existingRecipe = await this.recipeRepository.findById(command.id);
        if (!existingRecipe) {
            throw new NotFoundException(`Recipe with ID ${command.id} not found`);
        }

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

        try {
            // Reconstitute the recipe aggregate with the new data
            // We use the constructor directly because it's an update of an existing aggregate
            const recipe = new Recipe(
                command.id,
                command.title,
                command.description,
                command.locale,
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
                command.imageUrl,
            );

            // Domain validation would normally be here or in the entity
            // Since we use the constructor, we should manually trigger validation if needed
            // However, the CreateRecipeHandler does it via Recipe.create, we can do similar or just rely on the repository to save.
            // Let's add explicit validation as in CreateRecipeHandler.

            if (!recipe.ingredientSections || recipe.ingredientSections.length === 0) {
                throw new EmptyIngredientSectionsError();
            }
            if (!recipe.stepSections || recipe.stepSections.length === 0) {
                throw new EmptyStepSectionsError();
            }

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
