import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RecipeRepository, IngredientSectionData } from '../../../domain/ports/recipe.port';
import { Recipe } from '../../../domain/entities/recipe.entity';
import { RecipeMapper } from './recipe.mapper';


@Injectable()
export class PrismaRecipeRepository implements RecipeRepository {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(): Promise<Recipe[]> {
        const recipes = await this.prisma.recipe.findMany();
        return recipes.map(RecipeMapper.toDomain);
    }

    async findById(id: number): Promise<Recipe | null> {
        const recipe = await this.prisma.recipe.findUnique({ where: { id } });
        return recipe ? RecipeMapper.toDomain(recipe) : null;
    }

    async save(recipe: Recipe, ingredientSections?: IngredientSectionData[]): Promise<Recipe> {
        // Basic implementation for now - assuming creation if no ID, or we can separate create/update
        // For this use case, we are creating. 
        // Note: We need to handle Enum mapping if we strictly typed Enums in Domain. 
        // For now assuming strings match or we cast.

        // We are passing the logical "Recipe" entity. If ID is 0 or null, it's new.
        const data: any = {
            title: recipe.title,
            description: recipe.description,
            prepTime: recipe.prepTime,
            cookTime: recipe.cookTime,
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


        const saved = await this.prisma.recipe.create({ data });
        return RecipeMapper.toDomain(saved);
    }
}
