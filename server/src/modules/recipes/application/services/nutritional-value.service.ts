import { Injectable, Inject } from '@nestjs/common';
import { IIngredientsRepository } from '../../domain/ports/ingredients.port';
import { IRecipesRepository, RecipeIngredientWithNutrition } from '../../domain/ports/recipe.port';

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

export interface NutritionalInfo {
    calories: number;
    protein: number;
    carbohydrates: number;
    fiber: number;
    sugar: number;
    totalFat: number;
    saturatedFat: number;
    monounsatFat: number;
    polyunsatFat: number;
    transFat: number;
    cholesterol: number;
    sodium: number;
    potassium: number;
    calcium: number;
    iron: number;
    magnesium: number;
    zinc: number;
    vitaminA: number;
    vitaminC: number;
    vitaminD: number;
    vitaminE: number;
    vitaminK: number;
    vitaminB6: number;
    vitaminB12: number;
    folate: number;
}

export interface CalculationResult {
    perServing: NutritionalInfo;
    total: NutritionalInfo;
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
     * Create an empty NutritionalInfo object with all zeros
     */
    createEmptyNutrition(): NutritionalInfo {
        return {
            calories: 0,
            protein: 0,
            carbohydrates: 0,
            fiber: 0,
            sugar: 0,
            totalFat: 0,
            saturatedFat: 0,
            monounsatFat: 0,
            polyunsatFat: 0,
            transFat: 0,
            cholesterol: 0,
            sodium: 0,
            potassium: 0,
            calcium: 0,
            iron: 0,
            magnesium: 0,
            zinc: 0,
            vitaminA: 0,
            vitaminC: 0,
            vitaminD: 0,
            vitaminE: 0,
            vitaminK: 0,
            vitaminB6: 0,
            vitaminB12: 0,
            folate: 0,
        };
    }

    /**
     * Add two NutritionalInfo objects together
     */
    addNutrition(a: NutritionalInfo, b: Partial<NutritionalInfo>): NutritionalInfo {
        return {
            calories: a.calories + (b.calories ?? 0),
            protein: a.protein + (b.protein ?? 0),
            carbohydrates: a.carbohydrates + (b.carbohydrates ?? 0),
            fiber: a.fiber + (b.fiber ?? 0),
            sugar: a.sugar + (b.sugar ?? 0),
            totalFat: a.totalFat + (b.totalFat ?? 0),
            saturatedFat: a.saturatedFat + (b.saturatedFat ?? 0),
            monounsatFat: a.monounsatFat + (b.monounsatFat ?? 0),
            polyunsatFat: a.polyunsatFat + (b.polyunsatFat ?? 0),
            transFat: a.transFat + (b.transFat ?? 0),
            cholesterol: a.cholesterol + (b.cholesterol ?? 0),
            sodium: a.sodium + (b.sodium ?? 0),
            potassium: a.potassium + (b.potassium ?? 0),
            calcium: a.calcium + (b.calcium ?? 0),
            iron: a.iron + (b.iron ?? 0),
            magnesium: a.magnesium + (b.magnesium ?? 0),
            zinc: a.zinc + (b.zinc ?? 0),
            vitaminA: a.vitaminA + (b.vitaminA ?? 0),
            vitaminC: a.vitaminC + (b.vitaminC ?? 0),
            vitaminD: a.vitaminD + (b.vitaminD ?? 0),
            vitaminE: a.vitaminE + (b.vitaminE ?? 0),
            vitaminK: a.vitaminK + (b.vitaminK ?? 0),
            vitaminB6: a.vitaminB6 + (b.vitaminB6 ?? 0),
            vitaminB12: a.vitaminB12 + (b.vitaminB12 ?? 0),
            folate: a.folate + (b.folate ?? 0),
        };
    }

    /**
     * Scale nutrition values by a factor (for converting per-100g to actual grams)
     */
    scaleNutrition(nutrition: Partial<NutritionalInfo>, factor: number): Partial<NutritionalInfo> {
        return {
            calories: (nutrition.calories ?? 0) * factor,
            protein: (nutrition.protein ?? 0) * factor,
            carbohydrates: (nutrition.carbohydrates ?? 0) * factor,
            fiber: (nutrition.fiber ?? 0) * factor,
            sugar: (nutrition.sugar ?? 0) * factor,
            totalFat: (nutrition.totalFat ?? 0) * factor,
            saturatedFat: (nutrition.saturatedFat ?? 0) * factor,
            monounsatFat: (nutrition.monounsatFat ?? 0) * factor,
            polyunsatFat: (nutrition.polyunsatFat ?? 0) * factor,
            transFat: (nutrition.transFat ?? 0) * factor,
            cholesterol: (nutrition.cholesterol ?? 0) * factor,
            sodium: (nutrition.sodium ?? 0) * factor,
            potassium: (nutrition.potassium ?? 0) * factor,
            calcium: (nutrition.calcium ?? 0) * factor,
            iron: (nutrition.iron ?? 0) * factor,
            magnesium: (nutrition.magnesium ?? 0) * factor,
            zinc: (nutrition.zinc ?? 0) * factor,
            vitaminA: (nutrition.vitaminA ?? 0) * factor,
            vitaminC: (nutrition.vitaminC ?? 0) * factor,
            vitaminD: (nutrition.vitaminD ?? 0) * factor,
            vitaminE: (nutrition.vitaminE ?? 0) * factor,
            vitaminK: (nutrition.vitaminK ?? 0) * factor,
            vitaminB6: (nutrition.vitaminB6 ?? 0) * factor,
            vitaminB12: (nutrition.vitaminB12 ?? 0) * factor,
            folate: (nutrition.folate ?? 0) * factor,
        };
    }

    /**
     * Divide nutrition values by servings
     */
    divideByServings(nutrition: NutritionalInfo, servings: number): NutritionalInfo {
        if (servings <= 0) servings = 1;
        return {
            calories: nutrition.calories / servings,
            protein: nutrition.protein / servings,
            carbohydrates: nutrition.carbohydrates / servings,
            fiber: nutrition.fiber / servings,
            sugar: nutrition.sugar / servings,
            totalFat: nutrition.totalFat / servings,
            saturatedFat: nutrition.saturatedFat / servings,
            monounsatFat: nutrition.monounsatFat / servings,
            polyunsatFat: nutrition.polyunsatFat / servings,
            transFat: nutrition.transFat / servings,
            cholesterol: nutrition.cholesterol / servings,
            sodium: nutrition.sodium / servings,
            potassium: nutrition.potassium / servings,
            calcium: nutrition.calcium / servings,
            iron: nutrition.iron / servings,
            magnesium: nutrition.magnesium / servings,
            zinc: nutrition.zinc / servings,
            vitaminA: nutrition.vitaminA / servings,
            vitaminC: nutrition.vitaminC / servings,
            vitaminD: nutrition.vitaminD / servings,
            vitaminE: nutrition.vitaminE / servings,
            vitaminK: nutrition.vitaminK / servings,
            vitaminB6: nutrition.vitaminB6 / servings,
            vitaminB12: nutrition.vitaminB12 / servings,
            folate: nutrition.folate / servings,
        };
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

            // Scale and add nutrition (convert nulls to 0)
            const nutritionForScaling: Partial<NutritionalInfo> = {
                calories: ingredient.nutrition.calories ?? 0,
                protein: ingredient.nutrition.protein ?? 0,
                carbohydrates: ingredient.nutrition.carbohydrates ?? 0,
                fiber: ingredient.nutrition.fiber ?? 0,
                sugar: ingredient.nutrition.sugar ?? 0,
                totalFat: ingredient.nutrition.totalFat ?? 0,
                saturatedFat: ingredient.nutrition.saturatedFat ?? 0,
                monounsatFat: ingredient.nutrition.monounsatFat ?? 0,
                polyunsatFat: ingredient.nutrition.polyunsatFat ?? 0,
                transFat: ingredient.nutrition.transFat ?? 0,
                cholesterol: ingredient.nutrition.cholesterol ?? 0,
                sodium: ingredient.nutrition.sodium ?? 0,
                potassium: ingredient.nutrition.potassium ?? 0,
                calcium: ingredient.nutrition.calcium ?? 0,
                iron: ingredient.nutrition.iron ?? 0,
                magnesium: ingredient.nutrition.magnesium ?? 0,
                zinc: ingredient.nutrition.zinc ?? 0,
                vitaminA: ingredient.nutrition.vitaminA ?? 0,
                vitaminC: ingredient.nutrition.vitaminC ?? 0,
                vitaminD: ingredient.nutrition.vitaminD ?? 0,
                vitaminE: ingredient.nutrition.vitaminE ?? 0,
                vitaminK: ingredient.nutrition.vitaminK ?? 0,
                vitaminB6: ingredient.nutrition.vitaminB6 ?? 0,
                vitaminB12: ingredient.nutrition.vitaminB12 ?? 0,
                folate: ingredient.nutrition.folate ?? 0,
            };
            const scaledNutrition = this.scaleNutrition(nutritionForScaling, scaleFactor);
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

    /**
     * Calculate and save nutritional info for a recipe
     */
    async calculateAndSaveRecipeNutrition(recipeId: number): Promise<CalculationResult> {
        const result = await this.calculateRecipeNutrition(recipeId);

        // Save per-serving values to the database
        await this.recipesRepository.saveNutritionalInfo(recipeId, result.perServing as unknown as Record<string, number | null>);

        return result;
    }
}
