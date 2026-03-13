import type {
    ParticularityType,
    TimeUnit,
    RecipeIngredient,
    IngredientSection,
    Step,
    StepSection,
} from '../../domain/entities/recipe.entity';

export class UpdateRecipeCommand {
    constructor(
        public readonly id: number,
        public readonly title: string,
        public readonly description: string | null,
        public readonly locale: string,
        public readonly prepTime: number,
        public readonly prepTimeUnit: TimeUnit,
        public readonly cookTime: number,
        public readonly cookTimeUnit: TimeUnit,
        public readonly difficulty: string,
        public readonly type: string,
        public readonly cuisine: string,
        public readonly servings: number,
        public readonly authorId: string,
        public readonly ingredientSections: IngredientSection[],
        public readonly stepSections: StepSection[],
        public readonly particularities?: ParticularityType[],
        public readonly imageUrl?: string | null,
    ) { }
}
