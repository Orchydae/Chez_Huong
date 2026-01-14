/**
 * Recipe Repository Port
 *
 * Defines the interface for recipe persistence operations.
 * This is part of the hexagonal architecture - the domain defines what it needs,
 * and infrastructure adapters implement this interface.
 */

import {
    Recipe,
    RecipeIngredient,
    IngredientSection,
    Step,
    StepSection,
} from '../entities/recipe.entity';

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
    nutrition: {
        servingSize: number | null;
        calories: number | null;
        protein: number | null;
        carbohydrates: number | null;
        fiber: number | null;
        sugar: number | null;
        totalFat: number | null;
        saturatedFat: number | null;
        monounsatFat: number | null;
        polyunsatFat: number | null;
        transFat: number | null;
        cholesterol: number | null;
        sodium: number | null;
        potassium: number | null;
        calcium: number | null;
        iron: number | null;
        magnesium: number | null;
        zinc: number | null;
        vitaminA: number | null;
        vitaminC: number | null;
        vitaminD: number | null;
        vitaminE: number | null;
        vitaminK: number | null;
        vitaminB6: number | null;
        vitaminB12: number | null;
        folate: number | null;
    } | null;
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
     */
    getRecipeIngredientsWithNutrition(recipeId: number): Promise<RecipeIngredientWithNutrition[]>;

    /**
     * Get servings count for a recipe.
     */
    getRecipeServings(recipeId: number): Promise<number | null>;

    /**
     * Save/update nutritional info for a recipe.
     */
    saveNutritionalInfo(recipeId: number, nutrition: Record<string, number | null>): Promise<void>;
}

export const IRecipesRepository = Symbol('IRecipesRepository'); // Token for DI
