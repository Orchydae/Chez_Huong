import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateTranslationDto {
    @IsString()
    @IsNotEmpty()
    value!: string;
}
