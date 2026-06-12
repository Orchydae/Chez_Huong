import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class ConfirmIngredientDto {
    @IsInt()
    @Min(1)
    fdcId!: number;

    @IsString()
    @IsNotEmpty()
    name!: string;
}
