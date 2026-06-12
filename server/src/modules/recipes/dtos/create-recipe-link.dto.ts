import { IsEnum, IsInt, Min } from 'class-validator';
import { RecipeLinkKind } from '@prisma/client';

/** Body for POST /recipes/:id/links — the source recipe is the :id route param. */
export class CreateRecipeLinkDto {
    /** The recipe to link to. Must be published and not the source recipe itself. */
    @IsInt()
    @Min(1)
    toId!: number;

    /** PAIRS_WITH | USES | VARIATION_OF. */
    @IsEnum(RecipeLinkKind)
    kind!: RecipeLinkKind;
}
