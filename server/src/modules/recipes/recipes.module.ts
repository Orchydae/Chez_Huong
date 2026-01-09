import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { RecipesController } from './infrastructure/controllers/recipes.controller';
import { IngredientsController } from './infrastructure/controllers/ingredients.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { IRecipesRepository } from './domain/ports/recipe.port';
import { IIngredientsRepository } from './domain/ports/ingredients.port';
import { PrismaRecipeRepository } from './infrastructure/adapters/persistence/prisma.recipe.repository';
import { CreateRecipeHandler } from './application/commands/create-recipe.handler';
import { GetRecipesHandler } from './application/queries/get-recipes.handler';
import { GetRecipeHandler } from './application/queries/get-recipe.handler';
import { RecipesService } from './application/services/recipes.service';
import { IngredientsService } from './application/services/ingredients.service';
import { PrismaIngredientsRepository } from './infrastructure/adapters/persistence/prisma.ingredients.repository';
import { UsdaAdapter } from './infrastructure/adapters/external/usda.adapter';
import { UsdaPort } from './domain/ports/usda.port';

@Module({
    imports: [
        PrismaModule,
        HttpModule,
    ],
    controllers: [RecipesController, IngredientsController],
    providers: [
        RecipesService,
        IngredientsService,
        CreateRecipeHandler,
        GetRecipesHandler,
        GetRecipeHandler,
        {
            provide: IRecipesRepository,
            useClass: PrismaRecipeRepository,
        },
        {
            provide: IIngredientsRepository,
            useClass: PrismaIngredientsRepository,
        },
        {
            provide: UsdaPort,
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
