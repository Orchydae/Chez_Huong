import type { NutrientValues } from './nutrient-values';

/**
 * Canadian Daily Values (DV) used to compute %DV on a Nutrition Facts table.
 *
 * Source: Health Canada "Nutrition Labelling — Table of Daily Values"
 * (incorporated by reference into the Food and Drug Regulations, in-force
 * version dated 2022-10-20). These are the "any other case" column — adults
 * and children 4 years and older — which is what virtually every consumer
 * label uses.
 *
 * Notes specific to Canada (vs the US FDA values the client used before):
 *  - `saturatedFat` here is the allowance for SATURATED + TRANS fat COMBINED
 *    (20 g). The panel sums the two nutrients and shows one %DV against it.
 *  - `sugar` carries a %DV against TOTAL sugars (100 g) — the US instead uses
 *    "added sugars" (50 g).
 *  - `cholesterol` and `protein` are declared WITHOUT a %DV — they are
 *    intentionally absent from this map.
 *  - Units match {@link NutrientValues}: fats/carbs/fibre/sugar in g; minerals
 *    in mg; vitamins per the column noted in nutrient-values.ts.
 *
 * %DV = round(amountPerServing / dailyValue * 100).
 *
 * TODO(verify before launch): the primary Health Canada document lists
 * potassium at 4700 mg; a secondary source cited 3400 mg. Confirm against the
 * live canada.ca Table of Daily Values.
 */
export const CANADIAN_DAILY_VALUES: Partial<Record<keyof NutrientValues, number>> = {
    // Part 1 — macronutrients + sodium
    totalFat: 75,        // g
    saturatedFat: 20,    // g — SATURATED + TRANS combined
    carbohydrates: 300,  // g
    fiber: 28,           // g
    sugar: 100,          // g — total sugars
    sodium: 2300,        // mg

    // Part 2 — minerals
    potassium: 4700,     // mg
    calcium: 1300,       // mg
    iron: 18,            // mg
    magnesium: 420,      // mg
    zinc: 11,            // mg

    // Part 2 — vitamins
    vitaminA: 900,       // mcg RAE
    vitaminC: 90,        // mg
    vitaminD: 20,        // mcg
    vitaminE: 15,        // mg
    vitaminK: 120,       // mcg
    vitaminB6: 1.7,      // mg
    vitaminB12: 2.4,     // mcg
    folate: 400,         // mcg DFE
};
