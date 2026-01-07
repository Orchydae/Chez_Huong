import { Recipe as PrismaRecipe } from '@prisma/client';
import { Recipe } from '../../domain/recipe.entity';

export class RecipeMapper {
    static toDomain(raw: PrismaRecipe): Recipe {
        return new Recipe(
            raw.id,
            raw.title,
            raw.description,
            raw.prepTime,
            raw.cookTime,
            raw.difficulty,
            raw.type,
            raw.cuisine,
            raw.servings,
            raw.authorId,
        );
    }
}
