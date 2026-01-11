import { Recipe } from '../entities/recipe.entity';

// Note: IngredientSectionData is defined here to avoid circular dependency with application layer
export interface RecipeIngredientData {
    ingredientId: number;
    quantity: string;
    unit: string;
}

export interface IngredientSectionData {
    name: string;
    ingredients: RecipeIngredientData[];
}

export interface StepData {
    order: number;
    description: string;
    mediaUrl?: string;
}

export interface StepSectionData {
    title: string;
    steps: StepData[];
}

/**
 * Recipe ingredient with nutrition data for calculation
 */
export interface RecipeIngredientWithNutrition {
    ingredientId: number;
    quantity: string;
    unit: string;
    nutrition: {
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
    } | null;
}

export interface IRecipesRepository {
    findAll(): Promise<Recipe[]>;
    findById(id: number): Promise<Recipe | null>;
    save(recipe: Recipe, ingredientSections?: IngredientSectionData[], stepSections?: StepSectionData[]): Promise<Recipe>;

    /**
     * Get all ingredients for a recipe with their nutrition data (per 100g)
     */
    getRecipeIngredientsWithNutrition(recipeId: number): Promise<RecipeIngredientWithNutrition[]>;

    /**
     * Get servings count for a recipe
     */
    getRecipeServings(recipeId: number): Promise<number | null>;

    /**
     * Save/update nutritional info for a recipe
     */
    saveNutritionalInfo(recipeId: number, nutrition: Record<string, number | null>): Promise<void>;
}

export const IRecipesRepository = Symbol('IRecipesRepository'); // Token for DI
