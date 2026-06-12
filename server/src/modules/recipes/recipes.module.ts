import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../../prisma/prisma.module';
import { RecipesController } from './recipes.controller';
import { IngredientsController } from './ingredients.controller';
import { RecipesService } from './recipes.service';
import { RecipeLinksService } from './recipe-links.service';
import { IngredientsService } from './ingredients.service';
import { NutritionalValueService } from './nutritional-value.service';
import { UsdaService } from './usda.service';

@Module({
    imports: [PrismaModule, HttpModule],
    controllers: [RecipesController, IngredientsController],
    providers: [
        RecipesService,
        RecipeLinksService,
        IngredientsService,
        NutritionalValueService,
        UsdaService,
    ],
    // SocialInteraction enforces the same draft-visibility rule on its
    // recipe-scoped endpoints via RecipesService.assertReadable
    exports: [RecipesService],
})
export class RecipesModule { }
