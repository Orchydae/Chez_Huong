import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IRecipesRepository, RecipeIngredientWithNutrition } from '../../../domain/ports/recipe.port';
import { Recipe } from '../../../domain/entities/recipe.entity';
import { RecipeMapper } from './recipe.mapper';


@Injectable()
export class PrismaRecipeRepository implements IRecipesRepository {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(): Promise<Recipe[]> {
        const recipes = await this.prisma.recipe.findMany({
            include: {
                ingredientSections: {
                    include: { ingredients: true },
                },
                stepSections: {
                    include: { steps: true },
                },
                particularities: true,
            },
        });
        return recipes.map(RecipeMapper.toDomain);
    }

    async findById(id: number): Promise<Recipe | null> {
        const recipe = await this.prisma.recipe.findUnique({
            where: { id },
            include: {
                ingredientSections: {
                    include: { ingredients: true },
                },
                stepSections: {
                    include: { steps: true },
                },
                particularities: true,
            },
        });
        return recipe ? RecipeMapper.toDomain(recipe) : null;
    }

    async save(recipe: Recipe): Promise<Recipe> {
        // Recipe aggregate now contains all sections
        // Build create data from the aggregate
        const data: any = {
            title: recipe.title,
            title_fr: recipe.title_fr,
            description: recipe.description,
            description_fr: recipe.description_fr,
            prepTime: recipe.prepTime,
            prepTimeUnit: recipe.prepTimeUnit as any,
            cookTime: recipe.cookTime,
            cookTimeUnit: recipe.cookTimeUnit as any,
            difficulty: recipe.difficulty as any,
            type: recipe.type as any,
            cuisine: recipe.cuisine,
            servings: recipe.servings,
            author: { connect: { id: recipe.authorId } },
        };

        // Add ingredient sections from the aggregate
        if (recipe.ingredientSections && recipe.ingredientSections.length > 0) {
            data.ingredientSections = {
                create: recipe.ingredientSections.map(section => ({
                    name: section.name,
                    name_fr: section.name_fr,
                    ingredients: {
                        create: section.ingredients.map(recipeIng => ({
                            ingredientId: recipeIng.ingredientId,
                            quantity: recipeIng.quantity,
                            unit: recipeIng.unit,
                        }))
                    }
                }))
            };
        }

        // Add particularities if provided
        if (recipe.particularities && recipe.particularities.length > 0) {
            data.particularities = {
                create: recipe.particularities.map(type => ({
                    type: type,
                }))
            };
        }

        // Add stepSections from the aggregate if provided
        if (recipe.stepSections && recipe.stepSections.length > 0) {
            data.stepSections = {
                create: recipe.stepSections.map(section => ({
                    title: section.title,
                    title_fr: section.title_fr,
                    steps: {
                        create: section.steps.map(step => ({
                            order: step.order,
                            description: step.description,
                            description_fr: step.description_fr,
                            mediaUrl: step.mediaUrl,
                        }))
                    }
                }))
            };
        }

        const saved = await this.prisma.recipe.create({
            data,
            include: {
                ingredientSections: {
                    include: { ingredients: true },
                },
                stepSections: {
                    include: { steps: true },
                },
                particularities: true,
            },
        });
        return RecipeMapper.toDomain(saved);
    }

    async getRecipeIngredientsWithNutrition(recipeId: number): Promise<RecipeIngredientWithNutrition[]> {
        const sections = await this.prisma.ingredientSection.findMany({
            where: { recipeId },
            include: {
                ingredients: {
                    include: {
                        ingredient: {
                            include: {
                                nutrition: true,
                            },
                        },
                    },
                },
            },
        });

        const result: RecipeIngredientWithNutrition[] = [];

        for (const section of sections) {
            for (const recipeIngredient of section.ingredients) {
                result.push({
                    ingredientId: recipeIngredient.ingredientId,
                    quantity: recipeIngredient.quantity,
                    unit: recipeIngredient.unit,
                    nutrition: recipeIngredient.ingredient.nutrition ? {
                        servingSize: recipeIngredient.ingredient.nutrition.servingSize,
                        calories: recipeIngredient.ingredient.nutrition.calories,
                        protein: recipeIngredient.ingredient.nutrition.protein,
                        carbohydrates: recipeIngredient.ingredient.nutrition.carbohydrates,
                        fiber: recipeIngredient.ingredient.nutrition.fiber,
                        sugar: recipeIngredient.ingredient.nutrition.sugar,
                        totalFat: recipeIngredient.ingredient.nutrition.totalFat,
                        saturatedFat: recipeIngredient.ingredient.nutrition.saturatedFat,
                        monounsatFat: recipeIngredient.ingredient.nutrition.monounsatFat,
                        polyunsatFat: recipeIngredient.ingredient.nutrition.polyunsatFat,
                        transFat: recipeIngredient.ingredient.nutrition.transFat,
                        cholesterol: recipeIngredient.ingredient.nutrition.cholesterol,
                        sodium: recipeIngredient.ingredient.nutrition.sodium,
                        potassium: recipeIngredient.ingredient.nutrition.potassium,
                        calcium: recipeIngredient.ingredient.nutrition.calcium,
                        iron: recipeIngredient.ingredient.nutrition.iron,
                        magnesium: recipeIngredient.ingredient.nutrition.magnesium,
                        zinc: recipeIngredient.ingredient.nutrition.zinc,
                        vitaminA: recipeIngredient.ingredient.nutrition.vitaminA,
                        vitaminC: recipeIngredient.ingredient.nutrition.vitaminC,
                        vitaminD: recipeIngredient.ingredient.nutrition.vitaminD,
                        vitaminE: recipeIngredient.ingredient.nutrition.vitaminE,
                        vitaminK: recipeIngredient.ingredient.nutrition.vitaminK,
                        vitaminB6: recipeIngredient.ingredient.nutrition.vitaminB6,
                        vitaminB12: recipeIngredient.ingredient.nutrition.vitaminB12,
                        folate: recipeIngredient.ingredient.nutrition.folate,
                    } : null,
                });
            }
        }

        return result;
    }

    async getRecipeServings(recipeId: number): Promise<number | null> {
        const recipe = await this.prisma.recipe.findUnique({
            where: { id: recipeId },
            select: { servings: true },
        });
        return recipe?.servings ?? null;
    }
}
