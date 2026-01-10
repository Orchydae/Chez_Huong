import { Injectable, Inject } from '@nestjs/common';
import { IIngredientsRepository } from '../../domain/ports/ingredients.port';
import type { Ingredient, PendingIngredientMatch, IngredientWithNutrition, IngredientNutrition } from '../../domain/entities/ingredient.entity';
import { UsdaPort } from '../../domain/ports/usda.port';
import type { UsdaFoodMatch } from '../../domain/ports/usda.port';

export interface SearchIngredientResult {
    found: boolean;
    ingredients?: Ingredient[];
    matches?: UsdaFoodMatch[];
}

@Injectable()
export class IngredientsService {
    constructor(
        @Inject(IIngredientsRepository) private readonly ingredientsRepository: IIngredientsRepository,
        @Inject(UsdaPort) private readonly usdaRepository: UsdaPort,
    ) { }

    /**
     * Search for ingredients in the local database (partial match).
     * @returns Array of matching ingredients
     */
    async searchDatabase(query: string, limit = 50): Promise<Ingredient[]> {
        return this.ingredientsRepository.searchByName(query, limit);
    }

    /**
     * Search for ingredients in the USDA FoodData Central database.
     * Also saves matches as pending for later confirmation.
     * @returns Array of USDA food matches
     */
    async searchUsda(query: string, maxResults = 50): Promise<UsdaFoodMatch[]> {
        const usdaMatches = await this.usdaRepository.searchFoods(query, maxResults);

        if (usdaMatches.length > 0) {
            // Save matches for later confirmation
            await this.ingredientsRepository.savePendingMatches(query, usdaMatches);
        }

        return usdaMatches;
    }

    /**
     * Search for an ingredient - checks local DB first, then USDA.
     * @deprecated Consider using searchDatabase() and searchUsda() separately for more control
     */
    async searchIngredient(query: string): Promise<SearchIngredientResult> {
        // First check if ingredient exists in our database
        const existingIngredients = await this.searchDatabase(query);

        if (existingIngredients.length > 0) {
            return {
                found: true,
                ingredients: existingIngredients,
            };
        }

        // Not in DB, search USDA
        const usdaMatches = await this.searchUsda(query);

        return {
            found: false,
            matches: usdaMatches,
        };
    }

    /**
     * Confirm and create an ingredient from a USDA match.
     * Also fetches and saves nutritional information and portion data.
     */
    async confirmIngredient(fdcId: number, name: string): Promise<IngredientWithNutrition> {
        // Check if ingredient with this fdcId already exists
        const existingByFdcId = await this.ingredientsRepository.findByFdcId(fdcId);
        if (existingByFdcId) {
            // It exists - let's fetch it with nutrition to return complete data
            const withNutrition = await this.ingredientsRepository.findByIdWithNutrition(existingByFdcId.id);
            return withNutrition || { ...existingByFdcId, nutrition: null };
        }

        // Check if ingredient with this name already exists
        const existingByName = await this.ingredientsRepository.findByName(name);
        if (existingByName) {
            const withNutrition = await this.ingredientsRepository.findByIdWithNutrition(existingByName.id);
            return withNutrition || { ...existingByName, nutrition: null };
        }

        // Create new ingredient
        const ingredient = await this.ingredientsRepository.create(name, fdcId);
        let nutrition: IngredientNutrition | null = null;

        // Fetch and save nutrition
        try {
            const nutritionData = await this.usdaRepository.getFoodNutrition(fdcId);
            nutrition = await this.ingredientsRepository.saveNutrition(ingredient.id, nutritionData);
        } catch (error) {
            console.error(`Failed to fetch/save nutrition for FDC ID ${fdcId}:`, error);
            // Non-critical failure, continue without nutrition
        }

        // Fetch and save portion data for unit-to-gram conversions
        try {
            const portions = await this.usdaRepository.getFoodPortions(fdcId);
            if (portions.length > 0) {
                await this.ingredientsRepository.savePortions(ingredient.id, portions);
            }
        } catch (error) {
            console.error(`Failed to fetch/save portions for FDC ID ${fdcId}:`, error);
            // Non-critical failure, portions are optional
        }

        return {
            ...ingredient,
            nutrition,
        };
    }

    /**
     * Get all ingredients from the database with nutrition info
     */
    async findAll(): Promise<IngredientWithNutrition[]> {
        return this.ingredientsRepository.findAllWithNutrition();
    }

    /**
     * Get pending matches for a query
     */
    async getPendingMatches(query: string): Promise<PendingIngredientMatch[]> {
        return this.ingredientsRepository.getPendingMatches(query);
    }
}
