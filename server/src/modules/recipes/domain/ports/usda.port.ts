export interface UsdaFoodMatch {
    fdcId: number;
    name: string;
    description?: string;
    dataType?: string;
}

export interface UsdaNutritionData {
    // Macronutrients
    calories?: number;      // kcal
    protein?: number;       // g
    carbohydrates?: number; // g
    fiber?: number;         // g
    sugar?: number;         // g

    // Fats (detailed breakdown)
    totalFat?: number;      // g
    saturatedFat?: number;  // g
    monounsatFat?: number;  // g
    polyunsatFat?: number;  // g
    transFat?: number;      // g
    cholesterol?: number;   // mg

    // Minerals
    sodium?: number;        // mg
    potassium?: number;     // mg
    calcium?: number;       // mg
    iron?: number;          // mg
    magnesium?: number;     // mg
    zinc?: number;          // mg

    // Vitamins
    vitaminA?: number;      // mcg (RAE)
    vitaminC?: number;      // mg
    vitaminD?: number;      // mcg
    vitaminE?: number;      // mg
    vitaminK?: number;      // mcg
    vitaminB6?: number;     // mg
    vitaminB12?: number;    // mcg
    folate?: number;        // mcg
}

export interface UsdaPort {
    /**
     * Search for foods in the USDA FoodData Central database
     * @param query - Search term (e.g., "chicken breast")
     * @param maxResults - Maximum number of results to return (default: 50)
     * @returns Array of matching foods from USDA
     */
    searchFoods(query: string, maxResults?: number): Promise<UsdaFoodMatch[]>;

    /**
     * Get detailed nutrition data for a food by its FDC ID
     * @param fdcId - USDA FoodData Central ID
     * @returns Nutrition data (per 100g)
     */
    getFoodNutrition(fdcId: number): Promise<UsdaNutritionData>;
}

