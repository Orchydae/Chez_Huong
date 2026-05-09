import type { NutrientValues } from '../entities/nutrient-values.interface';

export interface UsdaFoodMatch {
    fdcId: number;
    name: string;
    description?: string;
    dataType?: string;
}

/**
 * Portion data from USDA FoodData Central
 * Maps a serving unit to its gram weight
 */
export interface UsdaPortionData {
    portionName: string;  // e.g., "cup", "tbsp", "large"
    gramWeight: number;   // grams per 1 unit
}

/**
 * Nutrition data from USDA FoodData Central (per 100g).
 * A partial view of the shared NutrientValues — fields are optional
 * because the USDA API may not provide all nutrients for every food.
 */
export type UsdaNutritionData = Partial<NutrientValues>;

export interface UsdaPort {
    /**
     * Search for foods in the USDA FoodData Central database
     * @param query - Search term (e.g., "chicken breast")
     * @param maxResults - Maximum number of results to return (default: 50)
     * @returns Array of matching foods from USDA
     */
    searchFoods(query: string, maxResults?: number): Promise<UsdaFoodMatch[]>;

    /**
     * Get detailed nutrition data for a food by its FDC ID
     * @param fdcId - USDA FoodData Central ID
     * @returns Nutrition data (per 100g)
     */
    getFoodNutrition(fdcId: number): Promise<UsdaNutritionData>;

    /**
     * Get portion/serving data for a food by its FDC ID
     * @param fdcId - USDA FoodData Central ID 
     * @returns Array of portions with gram weights
     */
    getFoodPortions(fdcId: number): Promise<UsdaPortionData[]>;
}

export const UsdaPort = Symbol('UsdaPort');
