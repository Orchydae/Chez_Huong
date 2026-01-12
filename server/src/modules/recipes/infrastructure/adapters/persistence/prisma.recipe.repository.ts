import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IRecipesRepository, IngredientSectionData, RecipeIngredientWithNutrition, StepSectionData } from '../../../domain/ports/recipe.port';
import { Recipe } from '../../../domain/entities/recipe.entity';
import { RecipeMapper } from './recipe.mapper';


@Injectable()
export class PrismaRecipeRepository implements IRecipesRepository {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(): Promise<Recipe[]> {
        const recipes = await this.prisma.recipe.findMany();
        return recipes.map(RecipeMapper.toDomain);
    }

    async findById(id: number): Promise<Recipe | null> {
        const recipe = await this.prisma.recipe.findUnique({ where: { id } });
        return recipe ? RecipeMapper.toDomain(recipe) : null;
    }

    async save(recipe: Recipe, ingredientSections?: IngredientSectionData[], stepSections?: StepSectionData[]): Promise<Recipe> {
        // Basic implementation for now - assuming creation if no ID, or we can separate create/update
        // For this use case, we are creating. 
        // Note: We need to handle Enum mapping if we strictly typed Enums in Domain. 
        // For now assuming strings match or we cast.

        // We are passing the logical "Recipe" entity. If ID is 0 or null, it's new.
        const data: any = {
            title: recipe.title,
            title_fr: recipe.title_fr,
            description: recipe.description,
            description_fr: recipe.description_fr,
            prepTime: recipe.prepTime,
            prepTimeUnit: recipe.prepTimeUnit as any,
            cookTime: recipe.cookTime,
            cookTimeUnit: recipe.cookTimeUnit as any,
            difficulty: recipe.difficulty as any, // Cast to Prisma Enum
            type: recipe.type as any,             // Cast to Prisma Enum
            cuisine: recipe.cuisine,
            servings: recipe.servings,
            author: { connect: { id: recipe.authorId } },
        };

        // Add ingredient sections if provided
        if (ingredientSections && ingredientSections.length > 0) {
            data.ingredientSections = {
                create: ingredientSections.map(section => ({
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

        // Add nutritionalInfo if provided
        if (recipe.nutritionalInfo) {
            data.nutritionalInfo = {
                create: {
                    calories: recipe.nutritionalInfo.calories,
                    protein: recipe.nutritionalInfo.protein,
                    carbohydrates: recipe.nutritionalInfo.carbohydrates,
                    fiber: recipe.nutritionalInfo.fiber,
                    sugar: recipe.nutritionalInfo.sugar,
                    totalFat: recipe.nutritionalInfo.totalFat,
                    saturatedFat: recipe.nutritionalInfo.saturatedFat,
                    monounsatFat: recipe.nutritionalInfo.monounsatFat,
                    polyunsatFat: recipe.nutritionalInfo.polyunsatFat,
                    transFat: recipe.nutritionalInfo.transFat,
                    cholesterol: recipe.nutritionalInfo.cholesterol,
                    sodium: recipe.nutritionalInfo.sodium,
                    potassium: recipe.nutritionalInfo.potassium,
                    calcium: recipe.nutritionalInfo.calcium,
                    iron: recipe.nutritionalInfo.iron,
                    magnesium: recipe.nutritionalInfo.magnesium,
                    zinc: recipe.nutritionalInfo.zinc,
                    vitaminA: recipe.nutritionalInfo.vitaminA,
                    vitaminC: recipe.nutritionalInfo.vitaminC,
                    vitaminD: recipe.nutritionalInfo.vitaminD,
                    vitaminE: recipe.nutritionalInfo.vitaminE,
                    vitaminK: recipe.nutritionalInfo.vitaminK,
                    vitaminB6: recipe.nutritionalInfo.vitaminB6,
                    vitaminB12: recipe.nutritionalInfo.vitaminB12,
                    folate: recipe.nutritionalInfo.folate,
                }
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
        // Add stepSections if provided
        if (stepSections && stepSections.length > 0) {
            data.stepSections = {
                create: stepSections.map(section => ({
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


        const saved = await this.prisma.recipe.create({ data });
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

    async saveNutritionalInfo(recipeId: number, nutrition: Record<string, number | null>): Promise<void> {
        await this.prisma.nutritionalInfo.upsert({
            where: { recipeId },
            update: {
                calories: nutrition.calories,
                protein: nutrition.protein,
                carbohydrates: nutrition.carbohydrates,
                fiber: nutrition.fiber,
                sugar: nutrition.sugar,
                totalFat: nutrition.totalFat,
                saturatedFat: nutrition.saturatedFat,
                monounsatFat: nutrition.monounsatFat,
                polyunsatFat: nutrition.polyunsatFat,
                transFat: nutrition.transFat,
                cholesterol: nutrition.cholesterol,
                sodium: nutrition.sodium,
                potassium: nutrition.potassium,
                calcium: nutrition.calcium,
                iron: nutrition.iron,
                magnesium: nutrition.magnesium,
                zinc: nutrition.zinc,
                vitaminA: nutrition.vitaminA,
                vitaminC: nutrition.vitaminC,
                vitaminD: nutrition.vitaminD,
                vitaminE: nutrition.vitaminE,
                vitaminK: nutrition.vitaminK,
                vitaminB6: nutrition.vitaminB6,
                vitaminB12: nutrition.vitaminB12,
                folate: nutrition.folate,
            },
            create: {
                recipeId,
                calories: nutrition.calories,
                protein: nutrition.protein,
                carbohydrates: nutrition.carbohydrates,
                fiber: nutrition.fiber,
                sugar: nutrition.sugar,
                totalFat: nutrition.totalFat,
                saturatedFat: nutrition.saturatedFat,
                monounsatFat: nutrition.monounsatFat,
                polyunsatFat: nutrition.polyunsatFat,
                transFat: nutrition.transFat,
                cholesterol: nutrition.cholesterol,
                sodium: nutrition.sodium,
                potassium: nutrition.potassium,
                calcium: nutrition.calcium,
                iron: nutrition.iron,
                magnesium: nutrition.magnesium,
                zinc: nutrition.zinc,
                vitaminA: nutrition.vitaminA,
                vitaminC: nutrition.vitaminC,
                vitaminD: nutrition.vitaminD,
                vitaminE: nutrition.vitaminE,
                vitaminK: nutrition.vitaminK,
                vitaminB6: nutrition.vitaminB6,
                vitaminB12: nutrition.vitaminB12,
                folate: nutrition.folate,
            },
        });
    }
}
