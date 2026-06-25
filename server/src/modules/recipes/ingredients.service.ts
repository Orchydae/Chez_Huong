import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RecipeStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UsdaService, UsdaFoodMatch, UsdaNutritionData, UsdaPortionData } from './usda.service';
import { NUTRIENT_KEYS, NutrientValues } from './nutrient-values';
import { normalizeUnit } from './nutrition.calculator';

/** Escape Prisma `contains` LIKE metacharacters so search text matches literally. */
function escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, '\\$&');
}

@Injectable()
export class IngredientsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly usda: UsdaService,
    ) { }

    // ─── Existence + lookup ───────────────────────────────────────────

    /** Returns ids passed in that do NOT exist in the ingredient table. */
    async findMissingIngredients(ids: number[]): Promise<number[]> {
        if (ids.length === 0) return [];
        const existing = await this.prisma.ingredient.findMany({
            where: { id: { in: ids } },
            select: { id: true },
        });
        const present = new Set(existing.map(i => i.id));
        return ids.filter(id => !present.has(id));
    }

    findAll() {
        return this.prisma.ingredient.findMany({
            include: { nutrition: true, translations: true },
            orderBy: { name: 'asc' },
        });
    }

    // ─── Search (local + USDA) ────────────────────────────────────────

    /**
     * Local partial-match search. Matches the canonical English name OR any
     * localized name (French / Vietnamese), so a French query finds an
     * already-translated ingredient. Translations are included so the picker
     * can show the localized label.
     */
    searchDatabase(query: string, limit = 50) {
        return this.prisma.ingredient.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { translations: { some: { name: { contains: query, mode: 'insensitive' } } } },
                ],
            },
            include: { translations: true },
            take: limit,
            orderBy: { name: 'asc' },
        });
    }

    // ─── Ingredient name translations (writer/admin) ──────────────────

    listTranslations(ingredientId: number) {
        return this.prisma.ingredientTranslation.findMany({
            where: { ingredientId },
            orderBy: { locale: 'asc' },
        });
    }

    /** Create or replace the localized name for one (ingredient, locale). */
    async upsertTranslation(ingredientId: number, locale: string, name: string) {
        await this.assertIngredientExists(ingredientId);
        const loc = locale.toLowerCase();
        return this.prisma.ingredientTranslation.upsert({
            where: { ingredientId_locale: { ingredientId, locale: loc } },
            update: { name },
            create: { ingredientId, locale: loc, name },
        });
    }

    async removeTranslation(ingredientId: number, locale: string) {
        await this.prisma.ingredientTranslation.deleteMany({
            where: { ingredientId, locale: locale.toLowerCase() },
        });
        return { deleted: true };
    }

    // ─── Portion weights (writer/admin) ───────────────────────────────

    /**
     * Set how much one of a count-based unit weighs (e.g. "1 piece = 120 g").
     * The unit is normalized to the same canonical portion name the nutrition
     * calculator looks up, then upserted on (ingredientId, portionName) — so an
     * author can make units like "pcs" contribute to a recipe's nutrition.
     */
    async upsertPortion(ingredientId: number, unit: string, gramWeight: number) {
        await this.assertIngredientExists(ingredientId);
        const portionName = normalizeUnit(unit);
        if (!portionName) throw new BadRequestException('A unit is required');
        return this.prisma.ingredientPortion.upsert({
            where: { ingredientId_portionName: { ingredientId, portionName } },
            update: { gramWeight },
            create: { ingredientId, portionName, gramWeight },
        });
    }

    private async assertIngredientExists(ingredientId: number): Promise<void> {
        const exists = await this.prisma.ingredient.findUnique({
            where: { id: ingredientId },
            select: { id: true },
        });
        if (!exists) throw new NotFoundException(`Ingredient ${ingredientId} not found`);
    }

    async searchUsda(query: string, maxResults = 50): Promise<UsdaFoodMatch[]> {
        const matches = await this.usda.searchFoods(query, maxResults);
        if (matches.length > 0) {
            await this.savePendingMatches(query, matches);
        }
        return matches;
    }

    /**
     * Convenience: runs local + USDA + published-recipe searches in parallel.
     * Recipes can be used AS an ingredient (nutrition rolls up by servings), so
     * they surface in the same picker. `excludeRecipeId` drops the recipe being
     * edited so it can't reference itself.
     */
    async searchIngredient(query: string, excludeRecipeId?: number) {
        // Each source is independent: a failure in one — most often a USDA
        // rate-limit (HTTP 429) or transient outage — must NOT sink the whole
        // picker. A failed source just yields no results (logged, never thrown),
        // so the author can still pick a catalogue ingredient, a recipe, or type
        // a free-text one.
        const [ingredients, matches, recipes] = await Promise.all([
            this.searchDatabase(query).catch((err: unknown) => {
                console.error('Local ingredient search failed:', err);
                return [];
            }),
            this.searchUsda(query).catch((err: unknown) => {
                console.error('USDA ingredient search failed (continuing without USDA):', err);
                return [];
            }),
            this.searchRecipes(query, excludeRecipeId).catch((err: unknown) => {
                console.error('Recipe-as-ingredient search failed:', err);
                return [];
            }),
        ]);
        return {
            found: ingredients.length > 0 || matches.length > 0 || recipes.length > 0,
            ingredients,
            matches,
            recipes,
        };
    }

    /** Published recipes whose title matches — selectable as a recipe-as-ingredient. */
    private searchRecipes(query: string, excludeRecipeId?: number, limit = 20) {
        return this.prisma.recipe.findMany({
            where: {
                status: RecipeStatus.PUBLISHED,
                title: { contains: escapeLike(query), mode: 'insensitive' },
                ...(excludeRecipeId ? { id: { not: excludeRecipeId } } : {}),
            },
            select: { id: true, title: true, slug: true },
            take: limit,
            orderBy: { title: 'asc' },
        });
    }

    getPendingMatches(query: string) {
        return this.prisma.pendingIngredientMatch.findMany({
            where: { searchQuery: query.toLowerCase() },
            orderBy: { createdAt: 'desc' },
        });
    }

    // ─── Confirm USDA match → real Ingredient ─────────────────────────

    async confirmIngredient(fdcId: number, name: string) {
        const existingByFdcId = await this.prisma.ingredient.findUnique({
            where: { fdcId },
            include: { nutrition: true, translations: true },
        });
        if (existingByFdcId) return existingByFdcId;

        const existingByName = await this.prisma.ingredient.findFirst({
            where: { name: { equals: name, mode: 'insensitive' } },
            include: { nutrition: true, translations: true },
        });
        if (existingByName) return existingByName;

        const ingredient = await this.prisma.ingredient.create({
            data: { name, fdcId },
        });

        // Nutrition + portions are best-effort: don't fail the confirm if USDA hiccups.
        try {
            const nutritionData = await this.usda.getFoodNutrition(fdcId);
            await this.saveNutrition(ingredient.id, nutritionData);
        } catch (err) {
            console.error(`Failed to fetch/save nutrition for FDC ${fdcId}:`, err);
        }
        try {
            const portions = await this.usda.getFoodPortions(fdcId);
            if (portions.length > 0) await this.savePortions(ingredient.id, portions);
        } catch (err) {
            console.error(`Failed to fetch/save portions for FDC ${fdcId}:`, err);
        }

        return this.prisma.ingredient.findUnique({
            where: { id: ingredient.id },
            include: { nutrition: true, translations: true },
        });
    }

    // ─── Internal helpers ─────────────────────────────────────────────

    private async savePendingMatches(query: string, matches: UsdaFoodMatch[]): Promise<void> {
        const q = query.toLowerCase();
        await this.prisma.pendingIngredientMatch.deleteMany({ where: { searchQuery: q } });
        await this.prisma.pendingIngredientMatch.createMany({
            data: matches.map(m => ({
                searchQuery: q,
                fdcId: m.fdcId,
                name: m.name,
                description: m.description ?? null,
                dataType: m.dataType ?? null,
            })),
        });
    }

    private async saveNutrition(ingredientId: number, n: UsdaNutritionData) {
        const data = this.nutritionRow(n);
        return this.prisma.ingredientNutrition.upsert({
            where: { ingredientId },
            update: { servingSize: 100, ...data },
            create: { ingredientId, servingSize: 100, ...data },
        });
    }

    private nutritionRow(n: UsdaNutritionData): Record<keyof NutrientValues, number | null> {
        const row = {} as Record<keyof NutrientValues, number | null>;
        for (const key of NUTRIENT_KEYS) row[key] = n[key] ?? null;
        return row;
    }

    private async savePortions(ingredientId: number, portions: UsdaPortionData[]) {
        for (const portion of portions) {
            await this.prisma.ingredientPortion.upsert({
                where: { ingredientId_portionName: { ingredientId, portionName: portion.portionName } },
                update: { gramWeight: portion.gramWeight },
                create: { ingredientId, portionName: portion.portionName, gramWeight: portion.gramWeight },
            });
        }
    }
}
