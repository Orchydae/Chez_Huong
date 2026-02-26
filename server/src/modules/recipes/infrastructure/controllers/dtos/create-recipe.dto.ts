import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested, ArrayMinSize, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateIngredientSectionDto } from './create-ingredient-section.dto';
import { CreateStepSectionDto } from './create-step-section.dto';
import { ParticularityType, TimeUnit } from '../../../domain/entities/recipe.entity';

export class CreateRecipeDto {
    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsString()
    @IsOptional()
    title_fr?: string;

    @IsString()
    @IsOptional()
    description!: string | null;

    @IsString()
    @IsOptional()
    description_fr?: string;

    @IsNumber()
    @IsNotEmpty()
    prepTime!: number;

    @IsOptional()
    @IsEnum(TimeUnit)
    prepTimeUnit?: TimeUnit = TimeUnit.MINUTES;

    @IsNumber()
    @IsNotEmpty()
    cookTime!: number;

    @IsOptional()
    @IsEnum(TimeUnit)
    cookTimeUnit?: TimeUnit = TimeUnit.MINUTES;

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

    @IsOptional()
    @IsArray()
    @IsEnum(ParticularityType, { each: true })
    particularities?: ParticularityType[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateStepSectionDto)
    @ArrayMinSize(1, { message: 'Recipe must have at least one step section' })
    stepSections!: CreateStepSectionDto[];
}
