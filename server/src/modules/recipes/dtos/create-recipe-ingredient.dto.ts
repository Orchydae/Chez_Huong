import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateRecipeIngredientDto {
    // Nutrition source — AT MOST ONE of ingredientId / recipeRefId. With neither,
    // the row is free-text (only displayName shows, no nutrition). The "exactly
    // one source, or a name" rule is enforced in RecipesService (the server is
    // the single source of truth), not via class-validator.
    @IsInt()
    @Min(1)
    @IsOptional()
    ingredientId?: number;

    /** Another recipe used as an ingredient — its nutrition rolls up by servings. */
    @IsInt()
    @Min(1)
    @IsOptional()
    recipeRefId?: number;

    /** Optional per-recipe display name shown instead of the catalogue/recipe name. */
    @IsString()
    @IsOptional()
    displayName?: string;

    // optional: an ingredient like "salt — to taste" has a unit but no amount
    @IsString()
    quantity!: string;

    // Required on a PUBLISHED recipe, not on a DRAFT — like the other content
    // fields, "non-empty" is a completeness rule enforced in RecipesService
    // (recipe-completeness.ts) at publish time, so a draft may leave it blank.
    // The DTO only guarantees the type.
    @IsString()
    unit!: string;
}
