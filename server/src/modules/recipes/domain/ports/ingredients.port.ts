export interface IngredientsPort {
    /**
     * Check if all ingredient IDs exist in the database
     * @param ingredientIds - Array of ingredient IDs to verify
     * @returns Array of ingredient IDs that do NOT exist
     */
    findMissingIngredients(ingredientIds: number[]): Promise<number[]>;
}
