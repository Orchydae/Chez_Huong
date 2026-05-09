import { Injectable, Inject } from '@nestjs/common';
import { IIngredientsRepository } from '../../domain/ports/ingredients.port';
import { IRecipesRepository, RecipeIngredientWithNutrition } from '../../domain/ports/recipe.port';
import { NutrientValues, RequiredNutrients, NUTRIENT_KEYS } from '../../domain/entities/nutrient-values.interface';

/**
 * Volume to mL conversions
 */
const VOLUME_TO_ML: Record<string, number> = {
    cup: 240,
    tbsp: 15,
    tablespoon: 15,
    tsp: 5,
    teaspoon: 5,
    ml: 1,
    l: 1000,
    liter: 1000,
    floz: 29.57,
    'fl oz': 29.57,
};

/**
 * Weight to grams conversions
 */
const WEIGHT_TO_GRAMS: Record<string, number> = {
    g: 1,
    gram: 1,
    kg: 1000,
    oz: 28.35,
    onz: 28.35,
    lb: 453.59,
    pound: 453.59,
};

/**
 * Unit aliases for normalization
 */
const UNIT_ALIASES: Record<string, string> = {
    cups: 'cup',
    tablespoons: 'tbsp',
    teaspoons: 'tsp',
    grams: 'g',
    kilograms: 'kg',
    ounces: 'oz',
    pounds: 'lb',
    lbs: 'lb',
    liters: 'l',
    milliliters: 'ml',
};

/**
 * Negligible units that contribute ~0g
 */
const NEGLIGIBLE_UNITS = new Set([
    'pinch',
    'dash',
    'smidgen',
    'drop',
    'to taste',
    'as needed',
]);

export interface CalculationResult {
    perServing: RequiredNutrients;
    total: RequiredNutrients;
    servings: number;
    ingredientsProcessed: number;
    ingredientsSkipped: string[];
}

@Injectable()
export class NutritionalValueService {
    constructor(
        @Inject(IIngredientsRepository) private readonly ingredientsRepository: IIngredientsRepository,
        @Inject(IRecipesRepository) private readonly recipesRepository: IRecipesRepository,
    ) { }

    /**
     * Parse a quantity string to a numeric value
     * Handles: fractions ("1/2"), decimals ("0.5"), ranges ("2-3" -> average), integers ("2")
     */
    parseQuantity(quantity: string): number {
        const trimmed = quantity.trim();

        // Handle ranges (e.g., "2-3" returns average 2.5)
        if (trimmed.includes('-')) {
            const parts = trimmed.split('-').map(p => this.parseQuantity(p.trim()));
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                return (parts[0] + parts[1]) / 2;
            }
        }

        // Handle mixed fractions (e.g., "1 1/2")
        const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
        if (mixedMatch) {
            const whole = parseInt(mixedMatch[1], 10);
            const numerator = parseInt(mixedMatch[2], 10);
            const denominator = parseInt(mixedMatch[3], 10);
            return whole + (numerator / denominator);
        }

        // Handle fractions (e.g., "1/2")
        const fractionMatch = trimmed.match(/^(\d+)\/(\d+)$/);
        if (fractionMatch) {
            const numerator = parseInt(fractionMatch[1], 10);
            const denominator = parseInt(fractionMatch[2], 10);
            return numerator / denominator;
        }

        // Handle decimals and integers
        const num = parseFloat(trimmed);
        return isNaN(num) ? 0 : num;
    }

    /**
     * Normalize unit to standard form
     */
    normalizeUnit(unit: string): string {
        const normalized = unit.toLowerCase().trim();
        return UNIT_ALIASES[normalized] || normalized;
    }

    /**
     * Check if a unit is a weight unit
     */
    isWeightUnit(unit: string): boolean {
        return unit in WEIGHT_TO_GRAMS;
    }

    /**
     * Check if a unit is a volume unit
     */
    isVolumeUnit(unit: string): boolean {
        return unit in VOLUME_TO_ML;
    }

    /**
     * Check if a unit is negligible (should be treated as 0g)
     */
    isNegligibleUnit(unit: string): boolean {
        return NEGLIGIBLE_UNITS.has(unit);
    }

    /**
     * Convert weight units to grams
     */
    weightToGrams(quantity: number, unit: string): number {
        const factor = WEIGHT_TO_GRAMS[unit];
        return factor ? quantity * factor : 0;
    }

    /**
     * Convert volume units to mL
     */
    volumeToMl(quantity: number, unit: string): number {
        const factor = VOLUME_TO_ML[unit];
        return factor ? quantity * factor : 0;
    }

    /**
     * Convert a recipe ingredient quantity to grams.
     * Priority: USDA portion data > weight conversion > volume fallback (1g=1ml)
     * 
     * @param ingredientId - The ingredient ID in the database
     * @param quantity - Quantity string (e.g., "2", "1/2", "2-3")
     * @param unit - Unit string (e.g., "cup", "tbsp", "g")
     * @returns Gram weight, or 0 if unable to convert
     */
    async convertToGrams(ingredientId: number, quantity: string, unit: string): Promise<number> {
        // Parse quantity
        const numericQty = this.parseQuantity(quantity);
        if (numericQty <= 0) {
            return 0;
        }

        // Normalize unit
        const normalizedUnit = this.normalizeUnit(unit);

        // Check for negligible units (pinch, dash, etc.)
        if (this.isNegligibleUnit(normalizedUnit)) {
            return 0;
        }

        // If unit is already grams/kg/oz/lb, direct conversion
        if (this.isWeightUnit(normalizedUnit)) {
            return this.weightToGrams(numericQty, normalizedUnit);
        }

        // Try USDA portion data first
        const portion = await this.ingredientsRepository.getPortionByName(ingredientId, normalizedUnit);
        if (portion) {
            return numericQty * portion.gramWeight;
        }

        // Fallback: volume units use 1g = 1ml (water density)
        if (this.isVolumeUnit(normalizedUnit)) {
            const mlAmount = this.volumeToMl(numericQty, normalizedUnit);
            return mlAmount; // 1ml = 1g
        }

        // Unable to convert - might be count-based (e.g., "2 eggs")
        // Try to find portion by common size names
        const sizePortion = await this.ingredientsRepository.getPortionByName(ingredientId, normalizedUnit);
        if (sizePortion) {
            return numericQty * sizePortion.gramWeight;
        }

        // Could not convert
        console.warn(`Unable to convert ${quantity} ${unit} to grams for ingredient ${ingredientId}`);
        return 0;
    }

    /**
     * Create an empty RequiredNutrients object with all zeros
     */
    createEmptyNutrition(): RequiredNutrients {
        const result = {} as RequiredNutrients;
        for (const key of NUTRIENT_KEYS) {
            result[key] = 0;
        }
        return result;
    }

    /**
     * Add two nutrition objects together
     */
    addNutrition(a: RequiredNutrients, b: Partial<NutrientValues>): RequiredNutrients {
        const result = {} as RequiredNutrients;
        for (const key of NUTRIENT_KEYS) {
            result[key] = a[key] + (b[key] ?? 0);
        }
        return result;
    }

    /**
     * Scale nutrition values by a factor (for converting per-100g to actual grams)
     */
    scaleNutrition(nutrition: Partial<NutrientValues>, factor: number): Partial<NutrientValues> {
        const result: Partial<NutrientValues> = {};
        for (const key of NUTRIENT_KEYS) {
            result[key] = (nutrition[key] ?? 0) * factor;
        }
        return result;
    }

    /**
     * Divide nutrition values by servings
     */
    divideByServings(nutrition: RequiredNutrients, servings: number): RequiredNutrients {
        if (servings <= 0) servings = 1;
        const result = {} as RequiredNutrients;
        for (const key of NUTRIENT_KEYS) {
            result[key] = nutrition[key] / servings;
        }
        return result;
    }

    /**
     * Calculate total nutritional values for a recipe.
     * - Converts each ingredient quantity to grams
     * - Scales per-100g nutrition data to actual grams used
     * - Sums all ingredients
     * - Returns both total and per-serving values
     */
    async calculateRecipeNutrition(recipeId: number): Promise<CalculationResult> {
        // Get all recipe ingredients with their nutrition data
        const ingredients = await this.recipesRepository.getRecipeIngredientsWithNutrition(recipeId);
        const servings = await this.recipesRepository.getRecipeServings(recipeId) ?? 1;

        let totalNutrition = this.createEmptyNutrition();
        let ingredientsProcessed = 0;
        const ingredientsSkipped: string[] = [];

        for (const ingredient of ingredients) {
            // Skip if no nutrition data
            if (!ingredient.nutrition) {
                ingredientsSkipped.push(`ID ${ingredient.ingredientId}: No nutrition data`);
                continue;
            }

            // Convert quantity to grams
            const grams = await this.convertToGrams(
                ingredient.ingredientId,
                ingredient.quantity,
                ingredient.unit
            );

            if (grams <= 0) {
                ingredientsSkipped.push(`ID ${ingredient.ingredientId}: Could not convert ${ingredient.quantity} ${ingredient.unit}`);
                continue;
            }

            // Calculate scaling factor (nutrition is per 100g)
            const scaleFactor = grams / 100;

            // Scale and add nutrition
            const scaledNutrition = this.scaleNutrition(ingredient.nutrition, scaleFactor);
            totalNutrition = this.addNutrition(totalNutrition, scaledNutrition);
            ingredientsProcessed++;
        }

        // Calculate per-serving values
        const perServingNutrition = this.divideByServings(totalNutrition, servings);

        return {
            perServing: perServingNutrition,
            total: totalNutrition,
            servings,
            ingredientsProcessed,
            ingredientsSkipped,
        };
    }
}


