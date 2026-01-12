import { Recipe as PrismaRecipe, NutritionalInfo } from '@prisma/client';
import { Recipe } from '../../../domain/entities/recipe.entity';

export type RecipeWithRelations = PrismaRecipe & {
    nutritionalInfo?: NutritionalInfo | null;
};

export class RecipeMapper {
    static toDomain(raw: RecipeWithRelations): Recipe {
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
        );
    }
}

