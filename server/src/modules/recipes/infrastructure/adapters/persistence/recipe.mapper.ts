import { Recipe as PrismaRecipe, IngredientSection as PrismaIngredientSection, RecipeIngredient as PrismaRecipeIngredient, StepSection as PrismaStepSection, Step as PrismaStep, Particularity as PrismaParticularity } from '@prisma/client';
import { Recipe, RecipeIngredient, IngredientSection, Step, StepSection, ParticularityType } from '../../../domain/entities/recipe.entity';

/**
 * Prisma Recipe with all relations for full domain mapping.
 */
export type RecipeWithRelations = PrismaRecipe & {
    ingredientSections?: (PrismaIngredientSection & {
        ingredients: PrismaRecipeIngredient[];
    })[];
    stepSections?: (PrismaStepSection & {
        steps: PrismaStep[];
    })[];
    particularities?: PrismaParticularity[];
};

/**
 * Mapper for converting between Prisma models and domain entities.
 */
export class RecipeMapper {
    /**
     * Convert Prisma Recipe to Domain Recipe.
     * Note: When reconstituting from DB, we use the constructor directly
     * to skip validation (data is already validated when created).
     */
    static toDomain(raw: RecipeWithRelations): Recipe {
        // Map ingredient sections
        const ingredientSections: IngredientSection[] = raw.ingredientSections?.map(section => {
            // Use constructor directly to avoid re-validation when reconstituting
            const ingredients = section.ingredients.map(ing =>
                new RecipeIngredient(ing.ingredientId, ing.quantity, ing.unit)
            );
            // Create section - ingredients already validated when originally created
            return Object.assign(
                Object.create(IngredientSection.prototype),
                { name: section.name, ingredients }
            ) as IngredientSection;
        }) || [];

        // Map step sections
        const stepSections: StepSection[] = raw.stepSections?.map(section => {
            const steps = section.steps.map(step =>
                new Step(step.order, step.description, step.mediaUrl || undefined)
            );
            // Create section - steps already validated when originally created
            return Object.assign(
                Object.create(StepSection.prototype),
                { title: section.title, steps }
            ) as StepSection;
        }) || [];

        // Map particularities
        const particularities = raw.particularities?.map(p => p.type as ParticularityType);

        // Use constructor directly to skip validation (data is from DB, already validated)
        return new Recipe(
            raw.id,
            raw.title,
            raw.description,
            raw.locale,
            raw.prepTime,
            raw.prepTimeUnit as any,
            raw.cookTime,
            raw.cookTimeUnit as any,
            raw.difficulty,
            raw.type,
            raw.cuisine,
            raw.servings,
            raw.authorId,
            ingredientSections,
            stepSections,
            particularities,
            raw.imageUrl,
        );
    }
}
