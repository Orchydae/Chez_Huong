/**
 * The recipe "publishability" contract, as a pure function.
 *
 * A DRAFT is a scratchpad: it may be blank or partial and is never run through
 * here. A recipe that is becoming or staying PUBLISHED must be complete — the
 * rules the write DTOs used to assert statically, before drafts were allowed to
 * be partial. Keeping this DB-free and side-effect-free makes it unit-testable
 * in isolation (see recipe-completeness.spec.ts), the same way the nutrition
 * math was split out of NutritionalValueService.
 */

/**
 * The minimal shape the contract inspects. Both the write DTOs
 * (CreateRecipeDto / UpdateRecipeDto) and a Prisma recipe row read with the
 * right `select` satisfy it, so one checker serves create, update, and publish.
 * Only fields that bear on completeness appear here.
 */
export interface RecipeCompletenessShape {
    cuisine: string;
    ingredientSections: {
        name: string;
        ingredients: {
            ingredientId?: number | null;
            recipeRefId?: number | null;
            displayName?: string | null;
            unit: string;
        }[];
    }[];
    stepSections: {
        title: string;
        steps: { description: string }[];
    }[];
}

/**
 * One incomplete field: a dotted path (e.g. `ingredientSections.0.ingredients.2`)
 * plus an English reason. The path mirrors the class-validator 400 shape so the
 * client can highlight the exact row/field — it owns no rules of its own.
 */
export interface CompletenessError {
    path: string;
    message: string;
}

/**
 * Returns every field that keeps this recipe from being published — an empty
 * array means it's complete. Pure: no DB, no throwing (the service wraps the
 * result in the shared 400 envelope).
 *
 * Contract: at least one ingredient section and one step section; each section
 * named and non-empty; each ingredient carrying a source (a catalogue id, a
 * recipe ref, or a free-text name) and a unit; each step a description.
 */
export function findRecipeCompletenessErrors(
    recipe: RecipeCompletenessShape,
): CompletenessError[] {
    const errors: CompletenessError[] = [];

    if (!recipe.cuisine.trim()) {
        errors.push({ path: 'cuisine', message: 'A published recipe needs a cuisine' });
    }

    if (recipe.ingredientSections.length === 0) {
        errors.push({
            path: 'ingredientSections',
            message: 'A published recipe must have at least one ingredient section',
        });
    }
    recipe.ingredientSections.forEach((section, si) => {
        if (!section.name.trim()) {
            errors.push({
                path: `ingredientSections.${si}.name`,
                message: 'An ingredient section needs a name',
            });
        }
        if (section.ingredients.length === 0) {
            errors.push({
                path: `ingredientSections.${si}.ingredients`,
                message: 'An ingredient section must have at least one ingredient',
            });
        }
        section.ingredients.forEach((row, ri) => {
            const path = `ingredientSections.${si}.ingredients.${ri}`;
            const hasSource =
                row.ingredientId != null ||
                row.recipeRefId != null ||
                !!row.displayName?.trim();
            if (!hasSource) {
                errors.push({ path, message: 'An ingredient needs a name or a chosen source' });
            }
            if (!row.unit.trim()) {
                errors.push({ path, message: 'An ingredient needs a unit' });
            }
        });
    });

    if (recipe.stepSections.length === 0) {
        errors.push({
            path: 'stepSections',
            message: 'A published recipe must have at least one step section',
        });
    }
    recipe.stepSections.forEach((section, si) => {
        if (!section.title.trim()) {
            errors.push({
                path: `stepSections.${si}.title`,
                message: 'A step section needs a title',
            });
        }
        if (section.steps.length === 0) {
            errors.push({
                path: `stepSections.${si}.steps`,
                message: 'A step section must have at least one step',
            });
        }
        section.steps.forEach((step, i) => {
            if (!step.description.trim()) {
                errors.push({
                    path: `stepSections.${si}.steps.${i}`,
                    message: 'A step needs a description',
                });
            }
        });
    });

    return errors;
}
