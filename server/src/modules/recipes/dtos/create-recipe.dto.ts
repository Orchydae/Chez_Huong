import {
    ArrayMinSize,
    ArrayUnique,
    IsArray,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUrl,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Difficulty, ParticularityType, RecipeStatus, RecipeType, TimeUnit } from '@prisma/client';
import { CreateIngredientSectionDto } from './create-ingredient-section.dto';
import { CreateStepSectionDto } from './create-step-section.dto';

export class CreateRecipeDto {
    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsString()
    @IsOptional()
    description!: string | null;

    @IsString()
    @IsNotEmpty()
    locale!: string;

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

    @IsEnum(Difficulty)
    difficulty!: Difficulty;

    @IsEnum(RecipeType)
    type!: RecipeType;

    @IsString()
    @IsNotEmpty()
    cuisine!: string;

    @IsNumber()
    @IsNotEmpty()
    servings!: number;

    @IsString()
    @IsUrl()
    @IsOptional()
    imageUrl?: string | null;

    /** Optional display-only yield ("makes 24 dumplings"); servings still drives nutrition. */
    @IsString()
    @IsOptional()
    yield?: string;

    /**
     * Create-time visibility choice. Omit (or DRAFT) to save privately; PUBLISHED
     * to publish in one step. Defaults to DRAFT in the service.
     */
    @IsOptional()
    @IsEnum(RecipeStatus)
    status?: RecipeStatus;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateIngredientSectionDto)
    @ArrayMinSize(1, { message: 'Recipe must have at least one ingredient section' })
    ingredientSections!: CreateIngredientSectionDto[];

    @IsOptional()
    @IsArray()
    @ArrayUnique()
    @IsEnum(ParticularityType, { each: true })
    particularities?: ParticularityType[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateStepSectionDto)
    @ArrayMinSize(1, { message: 'Recipe must have at least one step section' })
    stepSections!: CreateStepSectionDto[];
}
