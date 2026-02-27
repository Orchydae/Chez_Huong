/**
 * Create Recipe Command
 *
 * Command object for creating a new recipe. This is a simple DTO that
 * carries data from the controller to the handler. Validation is performed
 * in the domain layer when creating the Recipe entity.
 */

import type {
    ParticularityType,
    TimeUnit,
    RecipeIngredient,
    IngredientSection,
    Step,
    StepSection,
} from '../../domain/entities/recipe.entity';

// Re-export domain types for controller convenience
export {
    RecipeIngredient,
    IngredientSection,
    Step,
    StepSection,
} from '../../domain/entities/recipe.entity';

/**
 * Command for creating a new recipe.
 * All validation is deferred to the domain layer.
 */
export class CreateRecipeCommand {
    constructor(
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
    ) { }
}
