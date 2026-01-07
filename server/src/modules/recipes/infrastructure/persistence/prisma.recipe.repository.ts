import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RecipeRepository } from '../../domain/recipe.repository';
import { Recipe } from '../../domain/recipe.entity';
import { RecipeMapper } from './recipe.mapper';
import type { IngredientSectionData } from '../../application/commands/create-recipe.command';

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

        const saved = await this.prisma.recipe.create({ data });
        return RecipeMapper.toDomain(saved);
    }
}
