import { Injectable, Inject } from '@nestjs/common';
import { IngredientsPort } from '../../domain/ports/ingredients.port';
import type { Ingredient, PendingIngredientMatch, IngredientWithNutrition, IngredientNutrition } from '../../domain/entities/ingredient.entity';
import { UsdaPort } from '../../domain/ports/usda.port';
import type { UsdaFoodMatch } from '../../domain/ports/usda.port';

export interface SearchIngredientResult {
    found: boolean;
    ingredient?: Ingredient;
    matches?: UsdaFoodMatch[];
}

@Injectable()
export class IngredientsService {
    constructor(
        @Inject(IngredientsPort) private readonly ingredientsRepository: IngredientsPort,
        @Inject(UsdaPort) private readonly usdaPort: UsdaPort,
    ) { }

    /**
     * Search for an ingredient by name.
     * If found in DB, returns it. Otherwise searches USDA and returns matches.
     */
    async searchIngredient(query: string): Promise<SearchIngredientResult> {
        // First check if ingredient exists in our database
        const existingIngredient = await this.ingredientsRepository.findByName(query);

        if (existingIngredient) {
            return {
                found: true,
                ingredient: existingIngredient,
            };
        }

        // Not in DB, search USDA
        const usdaMatches = await this.usdaPort.searchFoods(query, 50);

        if (usdaMatches.length === 0) {
            return {
                found: false,
                matches: [],
            };
        }

        // Save matches for later confirmation
        await this.ingredientsRepository.savePendingMatches(query, usdaMatches);

        return {
            found: false,
            matches: usdaMatches,
        };
    }

    /**
     * Confirm and create an ingredient from a USDA match.
     * Also fetches and saves nutritional information.
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
            const nutritionData = await this.usdaPort.getFoodNutrition(fdcId);
            nutrition = await this.ingredientsRepository.saveNutrition(ingredient.id, nutritionData);
        } catch (error) {
            console.error(`Failed to fetch/save nutrition for FDC ID ${fdcId}:`, error);
            // Non-critical failure, continue without nutrition
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
