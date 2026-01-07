export interface Ingredient {
    id: number;
    name: string;
    fdcId: number | null;
}

export interface IngredientNutrition {
    id: number;
    ingredientId: number;
    servingSize: number | null;
    calories: number | null;
    protein: number | null;
    carbohydrates: number | null;
    fiber: number | null;
    sugar: number | null;
    totalFat: number | null;
    saturatedFat: number | null;
    monounsatFat: number | null;
    polyunsatFat: number | null;
    transFat: number | null;
    cholesterol: number | null;
    sodium: number | null;
    potassium: number | null;
    calcium: number | null;
    iron: number | null;
    magnesium: number | null;
    zinc: number | null;
    vitaminA: number | null;
    vitaminC: number | null;
    vitaminD: number | null;
    vitaminE: number | null;
    vitaminK: number | null;
    vitaminB6: number | null;
    vitaminB12: number | null;
    folate: number | null;
}

export interface IngredientWithNutrition extends Ingredient {
    nutrition: IngredientNutrition | null;
}

export interface PendingIngredientMatch {
    id: number;
    searchQuery: string;
    fdcId: number;
    name: string;
    description: string | null;
    dataType: string | null;
    createdAt: Date;
}
