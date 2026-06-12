import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
    CalculationResult,
    PortionMap,
    computeRecipeNutrition,
    portionKey,
} from './nutrition.calculator';
import { CANADIAN_DAILY_VALUES } from './daily-values';
import type { NutrientValues } from './nutrient-values';

/** Calculation result plus the Canadian Daily Values the client renders %DV against. */
export type RecipeNutritionResult = CalculationResult & {
    dailyValues: Partial<Record<keyof NutrientValues, number>>;
};

/**
 * Loads a recipe's nutrition inputs and hands them to the pure
 * {@link computeRecipeNutrition} calculator. This service owns only the I/O:
 * the math, unit conversion, and summing live in nutrition.calculator.ts where
 * they are tested with plain fixtures. Totals are NEVER persisted.
 */
@Injectable()
export class NutritionalValueService {
    constructor(private readonly prisma: PrismaService) { }

    async calculateRecipeNutrition(recipeId: number): Promise<RecipeNutritionResult> {
        const [sections, recipe] = await Promise.all([
            this.prisma.ingredientSection.findMany({
                where: { recipeId },
                include: {
                    ingredients: {
                        include: { ingredient: { include: { nutrition: true } } },
                    },
                },
            }),
            this.prisma.recipe.findUnique({
                where: { id: recipeId },
                select: { servings: true },
            }),
        ]);

        // Pre-load every portion these ingredients need in ONE query (no per-
        // ingredient lookup), then let the pure calculator do the rest.
        const ingredientIds = sections.flatMap(s => s.ingredients.map(i => i.ingredientId));
        const portions = await this.loadPortionMap(ingredientIds);

        return {
            ...computeRecipeNutrition(sections, portions, recipe?.servings ?? 1),
            dailyValues: CANADIAN_DAILY_VALUES,
        };
    }

    private async loadPortionMap(ingredientIds: number[]): Promise<PortionMap> {
        if (ingredientIds.length === 0) return new Map();
        const rows = await this.prisma.ingredientPortion.findMany({
            where: { ingredientId: { in: ingredientIds } },
            select: { ingredientId: true, portionName: true, gramWeight: true },
        });
        return new Map(rows.map(r => [portionKey(r.ingredientId, r.portionName), r.gramWeight]));
    }
}
