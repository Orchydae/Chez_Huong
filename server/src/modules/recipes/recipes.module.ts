import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RecipesController } from './infrastructure/adapters/api/recipes.controller';
import { IngredientsController } from './infrastructure/adapters/api/ingredients.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RecipeRepository } from './domain/recipe.repository';
import { PrismaRecipeRepository } from './infrastructure/persistence/prisma.recipe.repository';
import { CreateRecipeHandler } from './application/commands/create-recipe.handler';
import { GetRecipesHandler } from './application/queries/get-recipes.handler';
import { GetRecipeHandler } from './application/queries/get-recipe.handler';
import { RecipesService } from './application/recipes.service';
import { IngredientsService } from './application/ingredients.service';
import { PrismaIngredientsAdapter } from './infrastructure/adapters/persistence/prisma-ingredients.adapter';
import { UsdaAdapter } from './infrastructure/adapters/external/usda.adapter';

@Module({
    imports: [
        PrismaModule,
        HttpModule,
        ConfigModule,
    ],
    controllers: [RecipesController, IngredientsController],
    providers: [
        RecipesService,
        IngredientsService,
        CreateRecipeHandler,
        GetRecipesHandler,
        GetRecipeHandler,
        {
            provide: RecipeRepository,
            useClass: PrismaRecipeRepository,
        },
        {
            provide: 'IngredientsPort',
            useClass: PrismaIngredientsAdapter,
        },
        {
            provide: 'UsdaPort',
            useClass: UsdaAdapter,
        },
        {
            provide: 'USDA_API_KEY',
            useFactory: (configService: ConfigService) => {
                const apiKey = configService.get<string>('USDA_API_KEY');
                if (!apiKey) {
                    throw new Error('USDA_API_KEY environment variable is not set');
                }
                return apiKey;
            },
            inject: [ConfigService],
        },
    ],
})
export class RecipesModule { }

