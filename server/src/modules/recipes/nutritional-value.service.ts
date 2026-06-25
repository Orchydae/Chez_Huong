import { Injectable } from '@nestjs/common';
import { RecipeStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
    CalculationResult,
    PortionMap,
    addNutrition,
    computeRecipeNutrition,
    divideByServings,
    parseQuantity,
    portionKey,
    scaleNutrition,
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

    async calculateRecipeNutrition(
        recipeId: number,
        // recipe ids already on the current rollup path — guards against cycles
        // (A uses B uses A) and runaway depth when recipes are used as ingredients
        ancestry: ReadonlySet<number> = new Set(),
        // memo across the WHOLE top-level calculation: a recipe's nutrition is a
        // pure function of its own content, so compute each referenced recipe at
        // most once. Without this, a "diamond" graph (many recipes referencing a
        // shared child) recomputes the child exponentially. Safe because the
        // write side rejects cycles, so the read graph is a DAG.
        memo: Map<number, RecipeNutritionResult> = new Map(),
    ): Promise<RecipeNutritionResult> {
        const cached = memo.get(recipeId);
        if (cached) return cached;

        const [sections, recipe] = await Promise.all([
            this.prisma.ingredientSection.findMany({
                where: { recipeId },
                include: {
                    ingredients: {
                        include: {
                            ingredient: { include: { nutrition: true } },
                            recipeRef: { select: { id: true, status: true } },
                        },
                    },
                },
            }),
            this.prisma.recipe.findUnique({
                where: { id: recipeId },
                select: { servings: true },
            }),
        ]);
        const servings = recipe?.servings ?? 1;

        // Catalogue rows (ingredientId + nutrition) go to the pure calculator.
        // Free-text rows (no source) carry no nutrition and are simply omitted.
        const catalogueSections = sections.map(s => ({
            ingredients: s.ingredients
                .filter(i => i.ingredientId != null && i.ingredient)
                .map(i => ({
                    ingredientId: i.ingredientId as number,
                    quantity: i.quantity,
                    unit: i.unit,
                    ingredient: { nutrition: i.ingredient!.nutrition },
                })),
        }));
        const ingredientIds = catalogueSections.flatMap(s => s.ingredients.map(i => i.ingredientId));
        const portions = await this.loadPortionMap(ingredientIds);

        const base = computeRecipeNutrition(catalogueSections, portions, servings);
        let total = base.total;
        let processed = base.ingredientsProcessed;
        const skipped = [...base.ingredientsSkipped];

        // Roll up recipes used AS ingredients: add (sub per-serving × servings).
        const refRows = sections.flatMap(s => s.ingredients).filter(i => i.recipeRefId != null);
        const nextAncestry = new Set(ancestry).add(recipeId);
        for (const row of refRows) {
            const refId = row.recipeRefId as number;
            const count = parseQuantity(row.quantity);
            if (count <= 0) {
                skipped.push(`Recipe ${refId}: invalid servings amount`);
                continue;
            }
            if (row.recipeRef?.status !== RecipeStatus.PUBLISHED) {
                skipped.push(`Recipe ${refId}: not published`);
                continue;
            }
            if (nextAncestry.has(refId) || nextAncestry.size > 20) {
                skipped.push(`Recipe ${refId}: skipped to avoid a cycle`);
                continue;
            }
            const sub = await this.calculateRecipeNutrition(refId, nextAncestry, memo);
            total = addNutrition(total, scaleNutrition(sub.perServing, count));
            processed++;
        }

        const result: RecipeNutritionResult = {
            perServing: divideByServings(total, servings),
            total,
            servings,
            ingredientsProcessed: processed,
            ingredientsSkipped: skipped,
            dailyValues: CANADIAN_DAILY_VALUES,
        };
        memo.set(recipeId, result);
        return result;
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
