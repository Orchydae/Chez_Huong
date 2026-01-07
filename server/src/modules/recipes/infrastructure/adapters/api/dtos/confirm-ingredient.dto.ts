import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class ConfirmIngredientDto {
    @IsNumber()
    @IsNotEmpty()
    fdcId!: number;

    @IsString()
    @IsNotEmpty()
    name!: string;
}
