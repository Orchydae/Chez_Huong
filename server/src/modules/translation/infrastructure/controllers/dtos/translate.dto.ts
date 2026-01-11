import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TranslateDto {
    @IsString()
    @IsNotEmpty()
    text!: string;

    @IsString()
    @IsNotEmpty()
    targetLang!: string;

    @IsString()
    @IsOptional()
    sourceLang?: string;
}
