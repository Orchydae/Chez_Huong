import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested, ArrayMinSize, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateIngredientSectionDto } from './create-ingredient-section.dto';
import { CreateStepSectionDto } from './create-step-section.dto';
import { ParticularityType, TimeUnit } from '../../../domain/entities/recipe.entity';

export class NutritionalInfoDto {
    @IsNumber() @IsOptional() calories?: number;
    @IsNumber() @IsOptional() protein?: number;
    @IsNumber() @IsOptional() carbohydrates?: number;
    @IsNumber() @IsOptional() fiber?: number;
    @IsNumber() @IsOptional() sugar?: number;
    @IsNumber() @IsOptional() totalFat?: number;
    @IsNumber() @IsOptional() saturatedFat?: number;
    @IsNumber() @IsOptional() monounsatFat?: number;
    @IsNumber() @IsOptional() polyunsatFat?: number;
    @IsNumber() @IsOptional() transFat?: number;
    @IsNumber() @IsOptional() cholesterol?: number;
    @IsNumber() @IsOptional() sodium?: number;
    @IsNumber() @IsOptional() potassium?: number;
    @IsNumber() @IsOptional() calcium?: number;
    @IsNumber() @IsOptional() iron?: number;
    @IsNumber() @IsOptional() magnesium?: number;
    @IsNumber() @IsOptional() zinc?: number;
    @IsNumber() @IsOptional() vitaminA?: number;
    @IsNumber() @IsOptional() vitaminC?: number;
    @IsNumber() @IsOptional() vitaminD?: number;
    @IsNumber() @IsOptional() vitaminE?: number;
    @IsNumber() @IsOptional() vitaminK?: number;
    @IsNumber() @IsOptional() vitaminB6?: number;
    @IsNumber() @IsOptional() vitaminB12?: number;
    @IsNumber() @IsOptional() folate?: number;
}

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
    @ValidateNested()
    @Type(() => NutritionalInfoDto)
    nutritionalInfo?: NutritionalInfoDto;

    @IsOptional()
    @IsArray()
    @IsEnum(ParticularityType, { each: true })
    particularities?: ParticularityType[];

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateStepSectionDto)
    stepSections?: CreateStepSectionDto[];
}

