import { Recipe } from './recipe.entity';
import type { IngredientSectionData } from '../application/commands/create-recipe.command';

export interface RecipeRepository {
    findAll(): Promise<Recipe[]>;
    findById(id: number): Promise<Recipe | null>;
    save(recipe: Recipe, ingredientSections?: IngredientSectionData[]): Promise<Recipe>;
}

export const RecipeRepository = Symbol('RecipeRepository'); // Token for DI
