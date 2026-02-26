import {
    Recipe,
    RecipeIngredient,
    IngredientSection,
    Step,
    StepSection,
} from '../entities/recipe.entity';
import type { NutrientValues } from '../entities/nutrient-values.interface';

// Re-export domain types for convenience
export { RecipeIngredient, IngredientSection, Step, StepSection };

/**
 * Recipe ingredient with nutrition data for calculation.
 * Used when fetching ingredients with their nutritional information
 * for computing recipe nutrition totals.
 */
export interface RecipeIngredientWithNutrition {
    ingredientId: number;
    quantity: string;
    unit: string;
    nutrition: (NutrientValues & { servingSize: number | null }) | null;
}

/**
 * Repository interface for Recipe aggregate persistence.
 */
export interface IRecipesRepository {
    /**
     * Find all recipes.
     */
    findAll(): Promise<Recipe[]>;

    /**
     * Find a recipe by its ID.
     */
    findById(id: number): Promise<Recipe | null>;

    /**
     * Save a recipe (create or update).
     * The Recipe aggregate contains all ingredient sections and step sections.
     */
    save(recipe: Recipe): Promise<Recipe>;

    /**
     * Get all ingredients for a recipe with their nutrition data (per 100g).
     * Used by NutritionalValueService to compute recipe nutrition on demand.
     */
    getRecipeIngredientsWithNutrition(recipeId: number): Promise<RecipeIngredientWithNutrition[]>;

    /**
     * Get servings count for a recipe.
     */
    getRecipeServings(recipeId: number): Promise<number | null>;
}

export const IRecipesRepository = Symbol('IRecipesRepository'); // Token for DI
