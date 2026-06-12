import { IsNotEmpty, IsString } from 'class-validator';

/** Body for PUT /ingredients/:id/translations/:locale — id + locale come from the route. */
export class UpsertIngredientTranslationDto {
    @IsString()
    @IsNotEmpty()
    name!: string;
}
