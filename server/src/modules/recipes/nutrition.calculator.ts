import { NUTRIENT_KEYS, NutrientValues, RequiredNutrients } from './nutrient-values';

// ─── Unit tables ─────────────────────────────────────────────────────
const VOLUME_TO_ML: Record<string, number> = {
    cup: 240,
    tbsp: 15, tablespoon: 15,
    tsp: 5, teaspoon: 5,
    ml: 1, l: 1000, liter: 1000,
    floz: 29.57, 'fl oz': 29.57,
};

const WEIGHT_TO_GRAMS: Record<string, number> = {
    g: 1, gram: 1,
    kg: 1000,
    oz: 28.35, onz: 28.35,
    lb: 453.59, pound: 453.59,
};

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

const NEGLIGIBLE_UNITS = new Set(['pinch', 'dash', 'smidgen', 'drop', 'to taste', 'as needed']);

// ─── Inputs / outputs ────────────────────────────────────────────────

/**
 * Structural shape of the loaded ingredient-section rows the calculator
 * consumes. Prisma's `ingredientSection.findMany(... include ingredient.nutrition)`
 * result satisfies this; tests pass plain objects. The calculator imports no
 * Prisma types — the interface IS the test surface.
 */
export interface NutritionSectionInput {
    ingredients: {
        ingredientId: number;
        quantity: string;
        unit: string;
        ingredient: { nutrition: Partial<NutrientValues> | null };
    }[];
}

/**
 * Pre-loaded unit→gram weights, keyed by {@link portionKey}. The caller fetches
 * every relevant IngredientPortion in ONE query and builds this map, so the
 * calculator never touches the database (and there is no per-ingredient N+1).
 */
export type PortionMap = Map<string, number>;

export const portionKey = (ingredientId: number, normalizedUnit: string): string =>
    `${ingredientId}:${normalizedUnit}`;

export interface CalculationResult {
    perServing: RequiredNutrients;
    total: RequiredNutrients;
    servings: number;
    ingredientsProcessed: number;
    ingredientsSkipped: string[];
}

// ─── Pure helpers (exported for direct unit testing) ─────────────────

/** Parse a quantity string: plain number, fraction `1/2`, mixed `1 1/2`, or range `1-2` (averaged). */
export function parseQuantity(quantity: string): number {
    const trimmed = quantity.trim();

    if (trimmed.includes('-')) {
        const parts = trimmed.split('-').map(p => parseQuantity(p.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            return (parts[0] + parts[1]) / 2;
        }
    }

    const mixed = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (mixed) {
        return parseInt(mixed[1], 10) + parseInt(mixed[2], 10) / parseInt(mixed[3], 10);
    }

    const frac = trimmed.match(/^(\d+)\/(\d+)$/);
    if (frac) {
        return parseInt(frac[1], 10) / parseInt(frac[2], 10);
    }

    const num = parseFloat(trimmed);
    return isNaN(num) ? 0 : num;
}

export function normalizeUnit(unit: string): string {
    const normalized = unit.toLowerCase().trim();
    return UNIT_ALIASES[normalized] || normalized;
}

/**
 * Convert one RecipeIngredient's `(quantity, unit)` into grams.
 * Priority: direct weight conversion → pre-loaded USDA portion → volume fallback (1g≈1ml).
 * Returns 0 when the amount is negligible or can't be converted.
 */
export function convertToGrams(
    ingredientId: number,
    quantity: string,
    unit: string,
    portions: PortionMap,
): number {
    const numericQty = parseQuantity(quantity);
    if (numericQty <= 0) return 0;

    const normalizedUnit = normalizeUnit(unit);
    if (NEGLIGIBLE_UNITS.has(normalizedUnit)) return 0;
    if (normalizedUnit in WEIGHT_TO_GRAMS) return WEIGHT_TO_GRAMS[normalizedUnit] * numericQty;

    const gramWeight = portions.get(portionKey(ingredientId, normalizedUnit));
    if (gramWeight !== undefined) return numericQty * gramWeight;

    if (normalizedUnit in VOLUME_TO_ML) return VOLUME_TO_ML[normalizedUnit] * numericQty; // 1g = 1ml fallback

    return 0;
}

export function createEmptyNutrition(): RequiredNutrients {
    const result = {} as RequiredNutrients;
    for (const key of NUTRIENT_KEYS) result[key] = 0;
    return result;
}

export function addNutrition(a: RequiredNutrients, b: Partial<NutrientValues>): RequiredNutrients {
    const result = {} as RequiredNutrients;
    for (const key of NUTRIENT_KEYS) result[key] = a[key] + (b[key] ?? 0);
    return result;
}

export function scaleNutrition(nutrition: Partial<NutrientValues>, factor: number): Partial<NutrientValues> {
    const result: Partial<NutrientValues> = {};
    for (const key of NUTRIENT_KEYS) result[key] = (nutrition[key] ?? 0) * factor;
    return result;
}

export function divideByServings(nutrition: RequiredNutrients, servings: number): RequiredNutrients {
    const s = servings <= 0 ? 1 : servings;
    const result = {} as RequiredNutrients;
    for (const key of NUTRIENT_KEYS) result[key] = nutrition[key] / s;
    return result;
}

// ─── The deep entry point ────────────────────────────────────────────

/**
 * Compute a recipe's nutrition totals from already-loaded data. Pure: no I/O.
 * Each RecipeIngredient is converted to grams, its per-100g nutrition scaled
 * and summed; ingredients without nutrition or with unconvertible units are
 * skipped (and reported). `servings` is the per-serving divisor.
 */
export function computeRecipeNutrition(
    sections: NutritionSectionInput[],
    portions: PortionMap,
    servings: number,
): CalculationResult {
    let total = createEmptyNutrition();
    let ingredientsProcessed = 0;
    const ingredientsSkipped: string[] = [];

    for (const section of sections) {
        for (const ri of section.ingredients) {
            const nutrition = ri.ingredient.nutrition;
            if (!nutrition) {
                ingredientsSkipped.push(`ID ${ri.ingredientId}: No nutrition data`);
                continue;
            }
            const grams = convertToGrams(ri.ingredientId, ri.quantity, ri.unit, portions);
            if (grams <= 0) {
                ingredientsSkipped.push(`ID ${ri.ingredientId}: Could not convert ${ri.quantity} ${ri.unit}`);
                continue;
            }
            total = addNutrition(total, scaleNutrition(nutrition, grams / 100));
            ingredientsProcessed++;
        }
    }

    return {
        perServing: divideByServings(total, servings),
        total,
        servings,
        ingredientsProcessed,
        ingredientsSkipped,
    };
}
