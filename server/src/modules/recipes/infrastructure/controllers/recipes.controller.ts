import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RecipesService } from '../../application/services/recipes.service';
import { NutritionalValueService } from '../../application/services/nutritional-value.service';
import { CreateRecipeDto } from './dtos/create-recipe.dto';
import { CreateRecipeCommand } from '../../application/commands/create-recipe.command';
import {
    TimeUnit,
    RecipeIngredient,
    IngredientSection,
    Step,
    StepSection,
} from '../../domain/entities/recipe.entity';

@Controller('recipes')
export class RecipesController {
    constructor(
        private readonly recipesService: RecipesService,
        private readonly nutritionalValueService: NutritionalValueService,
    ) { }

    @Post()
    create(@Body() dto: CreateRecipeDto) {
        // Map DTO → Domain types → Command (infrastructure → domain → application)
        const ingredientSections = dto.ingredientSections.map(section =>
            new IngredientSection(
                section.name,
                section.name_fr || null,
                section.ingredients.map(ing =>
                    new RecipeIngredient(
                        ing.ingredientId,
                        ing.quantity,
                        ing.unit,
                    )
                ),
            )
        );

        const stepSections = dto.stepSections.map(section =>
            new StepSection(
                section.title,
                section.title_fr || null,
                section.steps.map(step =>
                    new Step(
                        step.order,
                        step.description,
                        step.description_fr || null,
                        step.mediaUrl,
                    )
                ),
            )
        );

        const command = new CreateRecipeCommand(
            dto.title,
            dto.title_fr,
            dto.description,
            dto.description_fr,
            dto.prepTime,
            dto.prepTimeUnit || TimeUnit.MINUTES,
            dto.cookTime,
            dto.cookTimeUnit || TimeUnit.MINUTES,
            dto.difficulty,
            dto.type,
            dto.cuisine,
            dto.servings,
            dto.authorId,
            ingredientSections,
            stepSections,
            dto.particularities,
        );

        return this.recipesService.create(command);
    }

    @Get()
    findAll() {
        return this.recipesService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.recipesService.findOne(+id);
    }

    /**
     * Calculate nutritional info for a recipe on demand (not saved to DB)
     */
    @Get(':id/nutrition')
    async getRecipeNutrition(@Param('id') id: string) {
        return this.nutritionalValueService.calculateRecipeNutrition(+id);
    }
}
