import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IngredientsService } from './ingredients.service';
import { ConfirmIngredientDto } from './dtos/confirm-ingredient.dto';
import { UpsertIngredientTranslationDto } from './dtos/upsert-ingredient-translation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

// The ingredient catalogue is authoring-only: writers/admins build it while
// composing recipes. Readers never touch it directly (recipe-by-ingredient
// discovery queries recipes, not this catalogue). Several routes also have
// write side-effects (USDA search caches PendingIngredientMatch rows; confirm
// creates Ingredient rows) — leaving them open let anyone mutate the catalogue.
@Controller('ingredients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.WRITER)
export class IngredientsController {
    constructor(private readonly ingredients: IngredientsService) { }

    /** Local DB partial-match search. */
    @Get('search/database')
    async searchDatabase(@Query('q') query: string) {
        const trimmed = this.requireQuery(query);
        const ingredients = await this.ingredients.searchDatabase(trimmed);
        return { query: trimmed, count: ingredients.length, ingredients };
    }

    /** USDA FoodData Central search. Side-effect: caches matches as pending. */
    @Get('search/usda')
    async searchUsda(@Query('q') query: string) {
        const trimmed = this.requireQuery(query);
        const matches = await this.ingredients.searchUsda(trimmed);
        return { query: trimmed, count: matches.length, matches };
    }

    /** Combined search — local first, USDA in parallel. */
    @Get('search')
    search(@Query('q') query: string) {
        const trimmed = this.requireQuery(query);
        return this.ingredients.searchIngredient(trimmed);
    }

    /** Promote a USDA match into a real Ingredient row (also stores nutrition + portions). */
    @Post('confirm')
    async confirm(@Body() dto: ConfirmIngredientDto) {
        const ingredient = await this.ingredients.confirmIngredient(dto.fdcId, dto.name);
        return { message: 'Ingredient confirmed and created', ingredient };
    }

    @Get()
    async findAll() {
        const ingredients = await this.ingredients.findAll();
        return { count: ingredients.length, ingredients };
    }

    @Get('pending')
    async getPending(@Query('q') query: string) {
        const trimmed = this.requireQuery(query);
        const matches = await this.ingredients.getPendingMatches(trimmed);
        return { query, count: matches.length, matches };
    }

    // ─── Ingredient name translations (fr / vi; en == base name) ──────

    @Get(':id/translations')
    listTranslations(@Param('id', ParseIntPipe) id: number) {
        return this.ingredients.listTranslations(id);
    }

    @Put(':id/translations/:locale')
    upsertTranslation(
        @Param('id', ParseIntPipe) id: number,
        @Param('locale') locale: string,
        @Body() dto: UpsertIngredientTranslationDto,
    ) {
        return this.ingredients.upsertTranslation(id, locale, dto.name);
    }

    @Delete(':id/translations/:locale')
    removeTranslation(
        @Param('id', ParseIntPipe) id: number,
        @Param('locale') locale: string,
    ) {
        return this.ingredients.removeTranslation(id, locale);
    }

    private requireQuery(query: string): string {
        if (!query || query.trim().length === 0) {
            throw new BadRequestException('Query parameter "q" is required');
        }
        return query.trim();
    }
}
