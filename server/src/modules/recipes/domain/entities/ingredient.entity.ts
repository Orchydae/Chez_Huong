import type { NutrientValues } from './nutrient-values.interface';

export interface Ingredient {
    id: number;
    name: string;
    fdcId: number | null;
}

/**
 * Nutritional data for an ingredient (per 100g, sourced from USDA).
 * Extends the shared NutrientValues interface with persistence-specific fields.
 */
export interface IngredientNutrition extends NutrientValues {
    id: number;
    ingredientId: number;
    servingSize: number | null;
}

export interface IngredientWithNutrition extends Ingredient {
    nutrition: IngredientNutrition | null;
}

export interface PendingIngredientMatch {
    id: number;
    searchQuery: string;
    fdcId: number;
    name: string;
    description: string | null;
    dataType: string | null;
    createdAt: Date;
}
