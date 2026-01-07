import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateIngredientSectionDto } from './create-ingredient-section.dto';

export class CreateRecipeDto {
    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsString()
    @IsOptional()
    description!: string | null;

    @IsNumber()
    @IsNotEmpty()
    prepTime!: number;

    @IsNumber()
    @IsNotEmpty()
    cookTime!: number;

    @IsString()
    @IsNotEmpty()
    difficulty!: string;

    @IsString()
    @IsNotEmpty()
    type!: string;

    @IsString()
    @IsNotEmpty()
    cuisine!: string;

    @IsNumber()
    @IsNotEmpty()
    servings!: number;

    @IsString()
    @IsNotEmpty()
    authorId!: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateIngredientSectionDto)
    @ArrayMinSize(1, { message: 'Recipe must have at least one ingredient section' })
    ingredientSections!: CreateIngredientSectionDto[];
}
