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

export interface RecipePort {
    findAll(): Promise<Recipe[]>;
    findById(id: number): Promise<Recipe | null>;
    save(recipe: Recipe, ingredientSections?: IngredientSectionData[]): Promise<Recipe>;
}

export const RecipePort = Symbol('RecipePort'); // Token for DI
