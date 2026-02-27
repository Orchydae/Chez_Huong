import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateRecipeIngredientDto } from './create-recipe-ingredient.dto';

export class CreateIngredientSectionDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateRecipeIngredientDto)
    @ArrayMinSize(1, { message: 'Each ingredient section must have at least one ingredient' })
    ingredients!: CreateRecipeIngredientDto[];
}
