/**
 * Recipe Domain Entity
 *
 * This module contains the Recipe aggregate root and its associated value objects.
 * The Recipe entity represents a complete recipe with all its ingredients and steps.
 *
 * Domain Model:
 * - Recipe (Aggregate Root)
 *   - IngredientSection[] (Value Object collection)
 *     - RecipeIngredient[] (Value Object collection)
 *   - StepSection[] (Value Object collection - optional)
 *     - Step[] (Value Object collection)
 *
 * Validation Rules:
 * - A Recipe MUST have at least one IngredientSection
 * - Each IngredientSection MUST have at least one RecipeIngredient
 * - If StepSections are provided, there MUST be at least one StepSection
 * - Each StepSection MUST have at least one Step
 */

// ============================================================================
// NUTRITIONAL INFO INTERFACE
// ============================================================================

/**
 * Nutritional information for a recipe (per serving or total).
 * All values are optional as not all recipes have complete nutritional data.
 */
export interface NutritionalInfo {
    calories?: number | null;
    protein?: number | null;
    carbohydrates?: number | null;
    fiber?: number | null;
    sugar?: number | null;
    totalFat?: number | null;
    saturatedFat?: number | null;
    monounsatFat?: number | null;
    polyunsatFat?: number | null;
    transFat?: number | null;
    cholesterol?: number | null;
    sodium?: number | null;
    potassium?: number | null;
    calcium?: number | null;
    iron?: number | null;
    magnesium?: number | null;
    zinc?: number | null;
    vitaminA?: number | null;
    vitaminC?: number | null;
    vitaminD?: number | null;
    vitaminE?: number | null;
    vitaminK?: number | null;
    vitaminB6?: number | null;
    vitaminB12?: number | null;
    folate?: number | null;
}

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Fixed dietary restriction/particularity types.
 * Used to categorize recipes by dietary requirements.
 */
export enum ParticularityType {
    VEGETARIAN = 'VEGETARIAN',
    VEGAN = 'VEGAN',
    GLUTEN_FREE = 'GLUTEN_FREE',
    DAIRY_FREE = 'DAIRY_FREE',
    NUT_FREE = 'NUT_FREE',
    EGG_FREE = 'EGG_FREE',
    SEAFOOD_FREE = 'SEAFOOD_FREE',
    SOY_FREE = 'SOY_FREE',
    HALAL = 'HALAL',
    KOSHER = 'KOSHER',
    LOW_SODIUM = 'LOW_SODIUM',
    LOW_SUGAR = 'LOW_SUGAR',
    LOW_CARB = 'LOW_CARB',
    HIGH_PROTEIN = 'HIGH_PROTEIN',
}

/**
 * Time units for prep and cook times.
 */
export enum TimeUnit {
    MINUTES = 'MINUTES',
    HOURS = 'HOURS',
}

// ============================================================================
// VALIDATION ERRORS
// ============================================================================

/**
 * Error thrown when a recipe is created without any ingredient sections.
 */
export class EmptyIngredientSectionsError extends Error {
    constructor() {
        super('Recipe must have at least one ingredient section');
        this.name = 'EmptyIngredientSectionsError';
    }
}

/**
 * Error thrown when an ingredient section has no ingredients.
 */
export class EmptyIngredientsError extends Error {
    constructor(sectionName: string) {
        super(`Ingredient section "${sectionName}" must have at least one ingredient`);
        this.name = 'EmptyIngredientsError';
    }
}

/**
 * Error thrown when a recipe is created without any step sections.
 */
export class EmptyStepSectionsError extends Error {
    constructor() {
        super('Recipe must have at least one step section');
        this.name = 'EmptyStepSectionsError';
    }
}

/**
 * Error thrown when a step section has no steps.
 */
export class EmptyStepsError extends Error {
    constructor(sectionTitle: string) {
        super(`Step section "${sectionTitle}" must have at least one step`);
        this.name = 'EmptyStepsError';
    }
}

// ============================================================================
// VALUE OBJECTS - INGREDIENTS
// ============================================================================

/**
 * Value object representing an ingredient within a recipe.
 * Links to an ingredient entity by ID and specifies quantity and unit.
 *
 * @example
 * new RecipeIngredient(1, '2', 'cups')      // 2 cups of ingredient #1
 * new RecipeIngredient(5, '100', 'g')       // 100 grams of ingredient #5
 * new RecipeIngredient(3, '1/2', 'tsp')     // 1/2 teaspoon of ingredient #3
 */
export class RecipeIngredient {
    constructor(
        /** Reference to the Ingredient entity */
        public readonly ingredientId: number,
        /** Quantity as a string to support fractions like "1/2" */
        public readonly quantity: string,
        /** Unit of measurement (e.g., "cups", "g", "tbsp") */
        public readonly unit: string,
    ) { }
}

/**
 * Value object representing a section of ingredients in a recipe.
 * Recipes often have multiple sections like "For the sauce", "For the filling", etc.
 *
 * Validation:
 * - Must have at least one ingredient
 *
 * @example
 * new IngredientSection('Sauce', 'Sauce', [
 *   new RecipeIngredient(1, '2', 'tbsp'),
 *   new RecipeIngredient(2, '1', 'cup'),
 * ])
 */
export class IngredientSection {
    constructor(
        /** Section name in English */
        public readonly name: string,
        /** Section name in French (optional) */
        public readonly name_fr: string | null,
        /** List of ingredients in this section (must have at least 1) */
        public readonly ingredients: RecipeIngredient[],
    ) {
        if (!ingredients || ingredients.length === 0) {
            throw new EmptyIngredientsError(name);
        }
    }
}

// ============================================================================
// VALUE OBJECTS - STEPS
// ============================================================================

/**
 * Value object representing a single step in a recipe.
 *
 * @example
 * new Step(1, 'Preheat oven to 350°F', 'Préchauffer le four à 180°C')
 * new Step(2, 'Mix dry ingredients', 'Mélanger les ingrédients secs', 'https://example.com/video.mp4')
 */
export class Step {
    constructor(
        /** Step order within the section (1-indexed) */
        public readonly order: number,
        /** Step description in English */
        public readonly description: string,
        /** Step description in French (optional) */
        public readonly description_fr: string | null,
        /** URL to media (image/video) demonstrating this step (optional) */
        public readonly mediaUrl?: string,
    ) { }
}

/**
 * Value object representing a section of steps in a recipe.
 * Recipes often have multiple sections like "Preparation", "Cooking", "Assembly", etc.
 *
 * Validation:
 * - Must have at least one step
 *
 * @example
 * new StepSection('Preparation', 'Préparation', [
 *   new Step(1, 'Wash vegetables', 'Laver les légumes'),
 *   new Step(2, 'Chop onions', 'Émincer les oignons'),
 * ])
 */
export class StepSection {
    constructor(
        /** Section title in English */
        public readonly title: string,
        /** Section title in French (optional) */
        public readonly title_fr: string | null,
        /** List of steps in this section (must have at least 1) */
        public readonly steps: Step[],
    ) {
        if (!steps || steps.length === 0) {
            throw new EmptyStepsError(title);
        }
    }
}

// ============================================================================
// AGGREGATE ROOT - RECIPE
// ============================================================================

/**
 * Recipe Aggregate Root
 *
 * Represents a complete recipe including metadata, ingredients, and steps.
 * This is the aggregate root that enforces invariants across the entire recipe.
 *
 * Invariants:
 * - Must have at least one ingredient section with at least one ingredient
 * - Must have at least one step section with at least one step
 *
 * Use the static `create()` factory method for new recipes with validation,
 * or the constructor directly when reconstituting from database.
 */
export class Recipe {
    /**
     * Constructor for reconstituting a Recipe from persistence.
     * Does NOT perform validation - use create() for new recipes.
     */
    constructor(
        public id: number,
        public title: string,
        public title_fr: string | null,
        public description: string | null,
        public description_fr: string | null,
        public prepTime: number,
        public prepTimeUnit: TimeUnit,
        public cookTime: number,
        public cookTimeUnit: TimeUnit,
        public difficulty: string,
        public type: string,
        public cuisine: string,
        public servings: number,
        public authorId: string,
        public ingredientSections: IngredientSection[],
        public stepSections: StepSection[],
        public nutritionalInfo?: NutritionalInfo | null,
        public particularities?: ParticularityType[],
    ) { }

    /**
     * Factory method for creating a new Recipe with full validation.
     *
     * @throws {EmptyIngredientSectionsError} If no ingredient sections provided
     * @throws {EmptyIngredientsError} If any ingredient section has no ingredients
     * @throws {EmptyStepSectionsError} If no step sections provided
     * @throws {EmptyStepsError} If any step section has no steps
     *
     * @example
     * const recipe = Recipe.create(
     *   'Pho Bo',
     *   'Soupe Pho au Boeuf',
     *   'Traditional Vietnamese soup',
     *   null,
     *   30, TimeUnit.MINUTES,
     *   120, TimeUnit.MINUTES,
     *   'MEDIUM', 'SOUP', 'VIETNAMESE',
     *   4, 'author-123',
     *   [new IngredientSection('Broth', null, [new RecipeIngredient(1, '2', 'kg')])],
     * );
     */
    static create(
        title: string,
        title_fr: string | null,
        description: string | null,
        description_fr: string | null,
        prepTime: number,
        prepTimeUnit: TimeUnit,
        cookTime: number,
        cookTimeUnit: TimeUnit,
        difficulty: string,
        type: string,
        cuisine: string,
        servings: number,
        authorId: string,
        ingredientSections: IngredientSection[],
        stepSections: StepSection[],
        nutritionalInfo?: NutritionalInfo | null,
        particularities?: ParticularityType[],
    ): Recipe {
        // Validate ingredient sections
        if (!ingredientSections || ingredientSections.length === 0) {
            throw new EmptyIngredientSectionsError();
        }

        // Validate step sections (required)
        if (!stepSections || stepSections.length === 0) {
            throw new EmptyStepSectionsError();
        }

        // Note: Individual section validation (empty ingredients/steps) is done
        // in the IngredientSection and StepSection constructors

        return new Recipe(
            0, // New recipe, ID will be assigned by persistence layer
            title,
            title_fr,
            description,
            description_fr,
            prepTime,
            prepTimeUnit,
            cookTime,
            cookTimeUnit,
            difficulty,
            type,
            cuisine,
            servings,
            authorId,
            ingredientSections,
            stepSections,
            nutritionalInfo,
            particularities,
        );
    }
}
