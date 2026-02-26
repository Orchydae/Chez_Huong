import { Recipe as PrismaRecipe, NutritionalInfo, IngredientSection as PrismaIngredientSection, RecipeIngredient as PrismaRecipeIngredient, StepSection as PrismaStepSection, Step as PrismaStep, Particularity as PrismaParticularity } from '@prisma/client';
import { Recipe, RecipeIngredient, IngredientSection, Step, StepSection, ParticularityType } from '../../../domain/entities/recipe.entity';

/**
 * Prisma Recipe with all relations for full domain mapping.
 */
export type RecipeWithRelations = PrismaRecipe & {
    nutritionalInfo?: NutritionalInfo | null;
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
                { name: section.name, name_fr: section.name_fr, ingredients }
            ) as IngredientSection;
        }) || [];

        // Map step sections
        const stepSections: StepSection[] = raw.stepSections?.map(section => {
            const steps = section.steps.map(step =>
                new Step(step.order, step.description, step.description_fr, step.mediaUrl || undefined)
            );
            // Create section - steps already validated when originally created
            return Object.assign(
                Object.create(StepSection.prototype),
                { title: section.title, title_fr: section.title_fr, steps }
            ) as StepSection;
        }) || [];

        // Map particularities
        const particularities = raw.particularities?.map(p => p.type as ParticularityType);

        // Use constructor directly to skip validation (data is from DB, already validated)
        return new Recipe(
            raw.id,
            raw.title,
            raw.title_fr,
            raw.description,
            raw.description_fr,
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
            raw.nutritionalInfo ? {
                calories: raw.nutritionalInfo.calories,
                protein: raw.nutritionalInfo.protein,
                carbohydrates: raw.nutritionalInfo.carbohydrates,
                fiber: raw.nutritionalInfo.fiber,
                sugar: raw.nutritionalInfo.sugar,
                totalFat: raw.nutritionalInfo.totalFat,
                saturatedFat: raw.nutritionalInfo.saturatedFat,
                monounsatFat: raw.nutritionalInfo.monounsatFat,
                polyunsatFat: raw.nutritionalInfo.polyunsatFat,
                transFat: raw.nutritionalInfo.transFat,
                cholesterol: raw.nutritionalInfo.cholesterol,
                sodium: raw.nutritionalInfo.sodium,
                potassium: raw.nutritionalInfo.potassium,
                calcium: raw.nutritionalInfo.calcium,
                iron: raw.nutritionalInfo.iron,
                magnesium: raw.nutritionalInfo.magnesium,
                zinc: raw.nutritionalInfo.zinc,
                vitaminA: raw.nutritionalInfo.vitaminA,
                vitaminC: raw.nutritionalInfo.vitaminC,
                vitaminD: raw.nutritionalInfo.vitaminD,
                vitaminE: raw.nutritionalInfo.vitaminE,
                vitaminK: raw.nutritionalInfo.vitaminK,
                vitaminB6: raw.nutritionalInfo.vitaminB6,
                vitaminB12: raw.nutritionalInfo.vitaminB12,
                folate: raw.nutritionalInfo.folate,
            } : null,
            particularities,
        );
    }
}
