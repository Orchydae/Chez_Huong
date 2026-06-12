import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class UpsertTranslationDto {
    @IsInt()
    @Min(1)
    recipeId!: number;

    /** Field path within the recipe — see CONTEXT.md "Field path". */
    @IsString()
    @IsNotEmpty()
    field!: string;

    /** Target locale code (e.g. "en", "fr", "vi"). */
    @IsString()
    @IsNotEmpty()
    locale!: string;

    @IsString()
    @IsNotEmpty()
    value!: string;
}
