import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

/**
 * Body for PUT /ingredients/:id/portions — the ingredient id comes from the
 * route. Records how much one of a count-based unit weighs (e.g. "1 piece =
 * 120 g") so the nutrition calculator can convert it. `unit` is normalized to a
 * canonical portion name server-side before storing.
 */
export class UpsertIngredientPortionDto {
    @IsString()
    @IsNotEmpty()
    unit!: string;

    @IsNumber()
    @IsPositive()
    gramWeight!: number;
}
