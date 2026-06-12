/**
 * Shared Nutrient Values shape.
 *
 * Single source of truth for the 25 tracked nutrients. Used by the
 * IngredientNutrition row (per-100g), USDA fetches, and the nutrition
 * calculation service. All fields are nullable to support partial data
 * (USDA may not provide every nutrient for every food).
 */
export interface NutrientValues {
    // Macronutrients
    calories?: number | null;       // kcal
    protein?: number | null;        // g
    carbohydrates?: number | null;  // g
    fiber?: number | null;          // g
    sugar?: number | null;          // g

    // Fats
    totalFat?: number | null;
    saturatedFat?: number | null;
    monounsatFat?: number | null;
    polyunsatFat?: number | null;
    transFat?: number | null;
    cholesterol?: number | null;    // mg

    // Minerals (mg)
    sodium?: number | null;
    potassium?: number | null;
    calcium?: number | null;
    iron?: number | null;
    magnesium?: number | null;
    zinc?: number | null;

    // Vitamins
    vitaminA?: number | null;       // mcg RAE
    vitaminC?: number | null;       // mg
    vitaminD?: number | null;       // mcg
    vitaminE?: number | null;       // mg
    vitaminK?: number | null;       // mcg
    vitaminB6?: number | null;      // mg
    vitaminB12?: number | null;     // mcg
    folate?: number | null;         // mcg
}

export const NUTRIENT_KEYS: (keyof NutrientValues)[] = [
    'calories', 'protein', 'carbohydrates', 'fiber', 'sugar',
    'totalFat', 'saturatedFat', 'monounsatFat', 'polyunsatFat', 'transFat', 'cholesterol',
    'sodium', 'potassium', 'calcium', 'iron', 'magnesium', 'zinc',
    'vitaminA', 'vitaminC', 'vitaminD', 'vitaminE', 'vitaminK',
    'vitaminB6', 'vitaminB12', 'folate',
];

/** Computed totals where every nutrient must be a concrete number. */
export type RequiredNutrients = Required<{ [K in keyof NutrientValues]: number }>;
