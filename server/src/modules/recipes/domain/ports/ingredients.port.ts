import type { UsdaFoodMatch, UsdaNutritionData } from './usda.port';
import type {
    Ingredient,
    IngredientNutrition,
    IngredientWithNutrition,
    PendingIngredientMatch,
} from '../entities/ingredient.entity';

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

export const IngredientsPort = Symbol('IngredientsPort');
