import { IsEnum, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Difficulty, ParticularityType, RecipeType } from '@prisma/client';

/**
 * Query parameters for recipe Discovery (`GET /recipes`). Every filter is
 * optional; combined filters are AND-ed. Discovery only ever returns PUBLISHED
 * recipes — drafts never surface here (enforced in the service, not here).
 */
export class DiscoverRecipesDto {
    /** Full-text-ish search across title + description (case-insensitive contains). */
    @IsOptional()
    @IsString()
    @MaxLength(100)
    q?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    cuisine?: string;

    @IsOptional()
    @IsEnum(Difficulty)
    difficulty?: Difficulty;

    @IsOptional()
    @IsEnum(RecipeType)
    type?: RecipeType;

    /** A single diet tag (Particularity), e.g. `VEGAN`. */
    @IsOptional()
    @IsEnum(ParticularityType)
    diet?: ParticularityType;

    /** Find-by-ingredient: recipes containing an ingredient whose name matches. */
    @IsOptional()
    @IsString()
    @MaxLength(100)
    ingredient?: string;

    /**
     * Active content language. When set to a non-base locale, `q` ALSO matches
     * a recipe's APPROVED title/description translations in that locale — so a
     * recipe is findable by its translated text. Base title/description always
     * match too.
     */
    @IsOptional()
    @IsString()
    @MaxLength(10)
    locale?: string;

    /** Ordering: `newest` (default, by createdAt) or `popular` (by like count). */
    @IsOptional()
    @IsIn(['newest', 'popular'])
    sort?: 'newest' | 'popular';

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    take?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    skip?: number;
}
