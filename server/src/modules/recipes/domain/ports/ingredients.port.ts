import type { UsdaFoodMatch, UsdaNutritionData } from './usda.port';

export interface Ingredient {
    id: number;
    name: string;
    fdcId: number | null;
}

export interface IngredientNutrition {
    id: number;
    ingredientId: number;
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

export interface IngredientsPort {
    /**
     * Check if all ingredient IDs exist in the database
     * @param ingredientIds - Array of ingredient IDs to verify
     * @returns Array of ingredient IDs that do NOT exist
     */
    findMissingIngredients(ingredientIds: number[]): Promise<number[]>;

    /**
     * Find an ingredient by its name (case-insensitive)
     */
    findByName(name: string): Promise<Ingredient | null>;

    /**
     * Find an ingredient by its USDA FoodData Central ID
     */
    findByFdcId(fdcId: number): Promise<Ingredient | null>;

    /**
     * Create a new ingredient
     */
    create(name: string, fdcId?: number): Promise<Ingredient>;

    /**
     * Get all ingredients
     */
    findAll(): Promise<Ingredient[]>;

    /**
     * Get all ingredients with their nutrition data
     */
    findAllWithNutrition(): Promise<IngredientWithNutrition[]>;

    /**
     * Find ingredient by ID with nutrition data
     */
    findByIdWithNutrition(id: number): Promise<IngredientWithNutrition | null>;

    /**
     * Save nutrition data for an ingredient
     */
    saveNutrition(ingredientId: number, nutrition: UsdaNutritionData): Promise<IngredientNutrition>;

    /**
     * Save pending USDA matches for a search query
     */
    savePendingMatches(query: string, matches: UsdaFoodMatch[]): Promise<void>;

    /**
     * Get pending matches for a search query
     */
    getPendingMatches(query: string): Promise<PendingIngredientMatch[]>;

    /**
     * Clear pending matches for a search query
     */
    clearPendingMatches(query: string): Promise<void>;
}

