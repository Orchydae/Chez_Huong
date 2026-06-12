import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateRecipeIngredientDto {
    @IsInt()
    @Min(1)
    ingredientId!: number;

    @IsString()
    @IsNotEmpty()
    quantity!: string;

    @IsString()
    @IsNotEmpty()
    unit!: string;
}
