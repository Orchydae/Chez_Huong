/**
 * Represents a portion/unit-to-gram conversion for an ingredient.
 * Sourced from USDA FoodData Central foodPortions.
 * e.g., "1 cup flour = 125g"
 */
export interface IngredientPortion {
    id: number;
    ingredientId: number;
    portionName: string;  // normalized: "cup", "tbsp", "large", "slice"
    gramWeight: number;   // grams per 1 unit of this portion
}
