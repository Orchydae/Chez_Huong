import type { NutritionalInfo, ParticularityType, TimeUnit } from '../../domain/entities/recipe.entity';

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

export class StepData {
    constructor(
        public readonly order: number,
        public readonly description: string,
        public readonly mediaUrl?: string,
    ) { }
}

export class StepSectionData {
    constructor(
        public readonly title: string,
        public readonly steps: StepData[],
    ) { }
}

export class CreateRecipeCommand {
    constructor(
        public readonly title: string,
        public readonly description: string | null,
        public readonly prepTime: number,
        public readonly prepTimeUnit: TimeUnit,
        public readonly cookTime: number,
        public readonly cookTimeUnit: TimeUnit,
        public readonly difficulty: string,
        public readonly type: string,
        public readonly cuisine: string,
        public readonly servings: number,
        public readonly authorId: string,
        public readonly ingredientSections: IngredientSectionData[],
        public readonly nutritionalInfo?: NutritionalInfo,
        public readonly particularities?: ParticularityType[],
        public readonly stepSections?: StepSectionData[],
    ) { }
}

