import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateRecipeIngredientDto {
    @IsNumber()
    @IsNotEmpty()
    ingredientId!: number;

    @IsString()
    @IsNotEmpty()
    quantity!: string;

    @IsString()
    @IsNotEmpty()
    unit!: string;
}
