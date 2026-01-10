import { Controller, Get, Post, Query, Body, BadRequestException } from '@nestjs/common';
import { IngredientsService } from '../../application/services/ingredients.service';
import { ConfirmIngredientDto } from './dtos/confirm-ingredient.dto';

@Controller('ingredients')
export class IngredientsController {
    constructor(private readonly ingredientsService: IngredientsService) { }

    /**
     * Search for ingredients in the local database (partial match)
     * 
     * GET /ingredients/search/database?q=chicken
     */
    @Get('search/database')
    async searchDatabase(@Query('q') query: string) {
        if (!query || query.trim().length === 0) {
            throw new BadRequestException('Query parameter "q" is required');
        }

        const ingredients = await this.ingredientsService.searchDatabase(query.trim());

        return {
            query: query.trim(),
            count: ingredients.length,
            ingredients,
        };
    }

    /**
     * Search for ingredients in the USDA FoodData Central database
     * 
     * GET /ingredients/search/usda?q=chicken
     */
    @Get('search/usda')
    async searchUsda(@Query('q') query: string) {
        if (!query || query.trim().length === 0) {
            throw new BadRequestException('Query parameter "q" is required');
        }

        const matches = await this.ingredientsService.searchUsda(query.trim());

        return {
            query: query.trim(),
            count: matches.length,
            matches,
        };
    }

    /**
     * Search for an ingredient - checks local DB first, then USDA
     * 
     * GET /ingredients/search?q=chicken
     */
    @Get('search')
    async search(@Query('q') query: string) {
        if (!query || query.trim().length === 0) {
            throw new BadRequestException('Query parameter "q" is required');
        }

        const result = await this.ingredientsService.searchIngredient(query.trim());

        return result;
    }

    /**
     * Confirm and create an ingredient from a USDA match
     * 
     * POST /ingredients/confirm
     * Body: { fdcId: number, name: string }
     */
    @Post('confirm')
    async confirm(@Body() dto: ConfirmIngredientDto) {
        const ingredient = await this.ingredientsService.confirmIngredient(dto.fdcId, dto.name);

        return {
            message: 'Ingredient confirmed and created',
            ingredient,
        };
    }

    /**
     * Get all ingredients in the database
     * 
     * GET /ingredients
     */
    @Get()
    async findAll() {
        const ingredients = await this.ingredientsService.findAll();

        return {
            count: ingredients.length,
            ingredients,
        };
    }

    /**
     * Get pending USDA matches for a search query
     * 
     * GET /ingredients/pending?q=chicken
     */
    @Get('pending')
    async getPending(@Query('q') query: string) {
        if (!query || query.trim().length === 0) {
            throw new BadRequestException('Query parameter "q" is required');
        }

        const matches = await this.ingredientsService.getPendingMatches(query.trim());

        return {
            query,
            count: matches.length,
            matches,
        };
    }
}
