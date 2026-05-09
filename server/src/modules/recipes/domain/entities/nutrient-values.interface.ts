/**
 * Shared Nutrient Values Interface
 *
 * Single source of truth for the 25 tracked nutrients.
 * Used by: Recipe (per-serving), IngredientNutrition (per-100g), USDA data, calculation service.
 *
 * All fields are optional and nullable to support partial data
 * (e.g., USDA may not provide all nutrients for every food).
 */
export interface NutrientValues {
    // Macronutrients
    calories?: number | null;      // kcal
    protein?: number | null;       // g
    carbohydrates?: number | null; // g
    fiber?: number | null;         // g
    sugar?: number | null;         // g

    // Fats (detailed breakdown)
    totalFat?: number | null;      // g
    saturatedFat?: number | null;  // g
    monounsatFat?: number | null;  // g (monounsaturated)
    polyunsatFat?: number | null;  // g (polyunsaturated)
    transFat?: number | null;      // g
    cholesterol?: number | null;   // mg

    // Minerals
    sodium?: number | null;        // mg
    potassium?: number | null;     // mg
    calcium?: number | null;       // mg
    iron?: number | null;          // mg
    magnesium?: number | null;     // mg
    zinc?: number | null;          // mg

    // Vitamins
    vitaminA?: number | null;      // mcg (RAE)
    vitaminC?: number | null;      // mg
    vitaminD?: number | null;      // mcg
    vitaminE?: number | null;      // mg
    vitaminK?: number | null;      // mcg
    vitaminB6?: number | null;     // mg
    vitaminB12?: number | null;    // mcg
    folate?: number | null;        // mcg
}

/**
 * All 25 nutrient field keys — useful for iterating over nutrients generically.
 */
export const NUTRIENT_KEYS: (keyof NutrientValues)[] = [
    'calories', 'protein', 'carbohydrates', 'fiber', 'sugar',
    'totalFat', 'saturatedFat', 'monounsatFat', 'polyunsatFat', 'transFat', 'cholesterol',
    'sodium', 'potassium', 'calcium', 'iron', 'magnesium', 'zinc',
    'vitaminA', 'vitaminC', 'vitaminD', 'vitaminE', 'vitaminK',
    'vitaminB6', 'vitaminB12', 'folate',
];

/**
 * NutrientValues with all fields required and non-nullable.
 * Used for computed totals where every field must have a concrete value.
 */
export type RequiredNutrients = Required<{ [K in keyof NutrientValues]: number }>;
