import {
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

    // Required on a PUBLISHED recipe, blank-able on a DRAFT — the "non-empty"
    // rule is a publish-time completeness check (recipe-completeness.ts), so a
    // draft (and every autosave) can be saved before the author fills it in.
    @IsString()
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

    // Structure only (an array of well-typed sections). Whether there's ENOUGH
    // here to publish — at least one section, each complete — is a completeness
    // rule enforced in RecipesService (recipe-completeness.ts), so a DRAFT may
    // send an empty or partial list.
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateIngredientSectionDto)
    ingredientSections!: CreateIngredientSectionDto[];

    @IsOptional()
    @IsArray()
    @ArrayUnique()
    @IsEnum(ParticularityType, { each: true })
    particularities?: ParticularityType[];

    // See ingredientSections: structure here, completeness at publish time.
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateStepSectionDto)
    stepSections!: CreateStepSectionDto[];
}
