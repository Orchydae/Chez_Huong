import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import type { IngredientsPort } from '../../../domain/ports/ingredients.port';

@Injectable()
export class PrismaIngredientsAdapter implements IngredientsPort {
    constructor(private readonly prisma: PrismaService) { }

    async findMissingIngredients(ingredientIds: number[]): Promise<number[]> {
        // Find all ingredients that exist
        const existingIngredients = await this.prisma.ingredient.findMany({
            where: {
                id: {
                    in: ingredientIds,
                },
            },
            select: {
                id: true,
            },
        });

        const existingIds = new Set(existingIngredients.map(i => i.id));

        // Return IDs that don't exist
        return ingredientIds.filter(id => !existingIds.has(id));
    }
}
