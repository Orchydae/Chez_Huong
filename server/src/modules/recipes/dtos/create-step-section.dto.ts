import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStepDto {
    @IsNumber()
    @IsNotEmpty()
    order!: number;

    // Required on a PUBLISHED recipe, blank-able on a DRAFT — "non-empty" is a
    // completeness rule enforced in RecipesService (recipe-completeness.ts) at
    // publish time, not here.
    @IsString()
    description!: string;

    @IsString()
    @IsOptional()
    mediaUrl?: string;
}

export class CreateStepSectionDto {
    // Like the section title and step body, "has a title / at least one step" is
    // a publish-time completeness rule (recipe-completeness.ts), so a DRAFT may
    // hold a blank, empty section.
    @IsString()
    title!: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateStepDto)
    steps!: CreateStepDto[];
}
