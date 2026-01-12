import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStepDto {
    @IsNumber()
    @IsNotEmpty()
    order!: number;

    @IsString()
    @IsNotEmpty()
    description!: string;

    @IsString()
    @IsOptional()
    description_fr?: string;

    @IsString()
    @IsOptional()
    mediaUrl?: string;
}

export class CreateStepSectionDto {
    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsString()
    @IsOptional()
    title_fr?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateStepDto)
    @ArrayMinSize(1, { message: 'Each step section must have at least one step' })
    steps!: CreateStepDto[];
}

