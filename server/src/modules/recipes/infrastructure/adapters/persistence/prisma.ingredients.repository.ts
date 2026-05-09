import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import type { IIngredientsRepository } from '../../../domain/ports/ingredients.port';
import type { Ingredient, PendingIngredientMatch, IngredientWithNutrition, IngredientNutrition } from '../../../domain/entities/ingredient.entity';
import type { UsdaFoodMatch, UsdaNutritionData } from '../../../domain/ports/usda.port';

@Injectable()
export class PrismaIngredientsRepository implements IIngredientsRepository {
    constructor(private readonly prisma: PrismaService) { }

    async findMissingIngredients(ingredientIds: number[]): Promise<number[]> {
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
        return ingredientIds.filter(id => !existingIds.has(id));
    }

    async findByName(name: string): Promise<Ingredient | null> {
        const ingredient = await this.prisma.ingredient.findFirst({
            where: {
                name: {
                    equals: name,
                    mode: 'insensitive',
                },
            },
        });

        return ingredient;
    }

    async searchByName(query: string, limit = 50): Promise<Ingredient[]> {
        const ingredients = await this.prisma.ingredient.findMany({
            where: {
                name: {
                    contains: query,
                    mode: 'insensitive',
                },
            },
            take: limit,
            orderBy: {
                name: 'asc',
            },
        });

        return ingredients;
    }

    async findByFdcId(fdcId: number): Promise<Ingredient | null> {
        const ingredient = await this.prisma.ingredient.findUnique({
            where: { fdcId },
        });

        return ingredient;
    }

    async create(name: string, fdcId?: number): Promise<Ingredient> {
        const ingredient = await this.prisma.ingredient.create({
            data: {
                name,
                fdcId: fdcId ?? null,
            },
        });

        return ingredient;
    }

    async findAll(): Promise<Ingredient[]> {
        return this.prisma.ingredient.findMany({
            orderBy: { name: 'asc' },
        });
    }

    async findAllWithNutrition(): Promise<IngredientWithNutrition[]> {
        const ingredients = await this.prisma.ingredient.findMany({
            include: {
                nutrition: true,
            },
            orderBy: { name: 'asc' },
        });

        return ingredients;
    }

    async findByIdWithNutrition(id: number): Promise<IngredientWithNutrition | null> {
        const ingredient = await this.prisma.ingredient.findUnique({
            where: { id },
            include: {
                nutrition: true,
            },
        });

        return ingredient;
    }

    async saveNutrition(ingredientId: number, nutrition: UsdaNutritionData): Promise<IngredientNutrition> {
        const saved = await this.prisma.ingredientNutrition.upsert({
            where: { ingredientId },
            update: {
                servingSize: 100, // USDA data is per 100g
                calories: nutrition.calories ?? null,
                protein: nutrition.protein ?? null,
                carbohydrates: nutrition.carbohydrates ?? null,
                fiber: nutrition.fiber ?? null,
                sugar: nutrition.sugar ?? null,
                totalFat: nutrition.totalFat ?? null,
                saturatedFat: nutrition.saturatedFat ?? null,
                monounsatFat: nutrition.monounsatFat ?? null,
                polyunsatFat: nutrition.polyunsatFat ?? null,
                transFat: nutrition.transFat ?? null,
                cholesterol: nutrition.cholesterol ?? null,
                sodium: nutrition.sodium ?? null,
                potassium: nutrition.potassium ?? null,
                calcium: nutrition.calcium ?? null,
                iron: nutrition.iron ?? null,
                magnesium: nutrition.magnesium ?? null,
                zinc: nutrition.zinc ?? null,
                vitaminA: nutrition.vitaminA ?? null,
                vitaminC: nutrition.vitaminC ?? null,
                vitaminD: nutrition.vitaminD ?? null,
                vitaminE: nutrition.vitaminE ?? null,
                vitaminK: nutrition.vitaminK ?? null,
                vitaminB6: nutrition.vitaminB6 ?? null,
                vitaminB12: nutrition.vitaminB12 ?? null,
                folate: nutrition.folate ?? null,
            },
            create: {
                ingredientId,
                servingSize: 100, // USDA data is per 100g
                calories: nutrition.calories ?? null,
                protein: nutrition.protein ?? null,
                carbohydrates: nutrition.carbohydrates ?? null,
                fiber: nutrition.fiber ?? null,
                sugar: nutrition.sugar ?? null,
                totalFat: nutrition.totalFat ?? null,
                saturatedFat: nutrition.saturatedFat ?? null,
                monounsatFat: nutrition.monounsatFat ?? null,
                polyunsatFat: nutrition.polyunsatFat ?? null,
                transFat: nutrition.transFat ?? null,
                cholesterol: nutrition.cholesterol ?? null,
                sodium: nutrition.sodium ?? null,
                potassium: nutrition.potassium ?? null,
                calcium: nutrition.calcium ?? null,
                iron: nutrition.iron ?? null,
                magnesium: nutrition.magnesium ?? null,
                zinc: nutrition.zinc ?? null,
                vitaminA: nutrition.vitaminA ?? null,
                vitaminC: nutrition.vitaminC ?? null,
                vitaminD: nutrition.vitaminD ?? null,
                vitaminE: nutrition.vitaminE ?? null,
                vitaminK: nutrition.vitaminK ?? null,
                vitaminB6: nutrition.vitaminB6 ?? null,
                vitaminB12: nutrition.vitaminB12 ?? null,
                folate: nutrition.folate ?? null,
            },
        });

        return saved;
    }

    async savePendingMatches(query: string, matches: UsdaFoodMatch[]): Promise<void> {
        // Clear any existing matches for this query first
        await this.clearPendingMatches(query);

        // Insert new matches
        await this.prisma.pendingIngredientMatch.createMany({
            data: matches.map(match => ({
                searchQuery: query.toLowerCase(),
                fdcId: match.fdcId,
                name: match.name,
                description: match.description ?? null,
                dataType: match.dataType ?? null,
            })),
        });
    }

    async getPendingMatches(query: string): Promise<PendingIngredientMatch[]> {
        const matches = await this.prisma.pendingIngredientMatch.findMany({
            where: {
                searchQuery: query.toLowerCase(),
            },
            orderBy: { createdAt: 'desc' },
        });

        return matches;
    }

    async clearPendingMatches(query: string): Promise<void> {
        await this.prisma.pendingIngredientMatch.deleteMany({
            where: {
                searchQuery: query.toLowerCase(),
            },
        });
    }

    // ===== Portion Methods =====

    async savePortions(ingredientId: number, portions: { portionName: string; gramWeight: number }[]): Promise<void> {
        if (portions.length === 0) return;

        // Upsert each portion
        for (const portion of portions) {
            await this.prisma.ingredientPortion.upsert({
                where: {
                    ingredientId_portionName: {
                        ingredientId,
                        portionName: portion.portionName,
                    },
                },
                update: {
                    gramWeight: portion.gramWeight,
                },
                create: {
                    ingredientId,
                    portionName: portion.portionName,
                    gramWeight: portion.gramWeight,
                },
            });
        }
    }

    async getPortions(ingredientId: number): Promise<{ portionName: string; gramWeight: number }[]> {
        const portions = await this.prisma.ingredientPortion.findMany({
            where: { ingredientId },
            select: {
                portionName: true,
                gramWeight: true,
            },
        });

        return portions;
    }

    async getPortionByName(ingredientId: number, portionName: string): Promise<{ gramWeight: number } | null> {
        const portion = await this.prisma.ingredientPortion.findUnique({
            where: {
                ingredientId_portionName: {
                    ingredientId,
                    portionName,
                },
            },
            select: {
                gramWeight: true,
            },
        });

        return portion;
    }
}

