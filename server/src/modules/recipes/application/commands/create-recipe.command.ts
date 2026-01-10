import type { NutritionalInfo, ParticularityType } from '../../domain/entities/recipe.entity';

export class RecipeIngredientData {
    constructor(
        public readonly ingredientId: number,
        public readonly quantity: string,
        public readonly unit: string,
    ) { }
}

export class IngredientSectionData {
    constructor(
        public readonly name: string,
        public readonly ingredients: RecipeIngredientData[],
    ) { }
}

export class CreateRecipeCommand {
    constructor(
        public readonly title: string,
        public readonly description: string | null,
        public readonly prepTime: number,
        public readonly cookTime: number,
        public readonly difficulty: string,
        public readonly type: string,
        public readonly cuisine: string,
        public readonly servings: number,
        public readonly authorId: string,
        public readonly ingredientSections: IngredientSectionData[],
        public readonly nutritionalInfo?: NutritionalInfo,
        public readonly particularities?: ParticularityType[],
    ) { }
}

