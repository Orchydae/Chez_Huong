import { IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateRecipeIngredientDto } from './create-recipe-ingredient.dto';

export class CreateIngredientSectionDto {
    // A DRAFT may leave the name blank and the list empty; a PUBLISHED recipe
    // must have a named section with at least one complete ingredient. That
    // "must" is a completeness rule enforced in RecipesService
    // (recipe-completeness.ts) at publish time — the DTO only checks the types.
    @IsString()
    name!: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateRecipeIngredientDto)
    ingredients!: CreateRecipeIngredientDto[];
}
