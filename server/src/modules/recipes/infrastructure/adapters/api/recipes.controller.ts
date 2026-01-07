import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RecipesService } from '../../../application/recipes.service';
import { CreateRecipeDto } from './dtos/create-recipe.dto';
import { CreateRecipeCommand, IngredientSectionData, RecipeIngredientData } from '../../../application/commands/create-recipe.command';

@Controller('recipes')
export class RecipesController {
    constructor(private readonly recipesService: RecipesService) { }

    @Post()
    create(@Body() dto: CreateRecipeDto) {
        // Map DTO → Command (infrastructure → application)
        const command = new CreateRecipeCommand(
            dto.title,
            dto.description,
            dto.prepTime,
            dto.cookTime,
            dto.difficulty,
            dto.type,
            dto.cuisine,
            dto.servings,
            dto.authorId,
            dto.ingredientSections.map(section =>
                new IngredientSectionData(
                    section.name,
                    section.ingredients.map(ing =>
                        new RecipeIngredientData(
                            ing.ingredientId,
                            ing.quantity,
                            ing.unit
                        )
                    )
                )
            ),
            dto.nutritionalInfo
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
}
