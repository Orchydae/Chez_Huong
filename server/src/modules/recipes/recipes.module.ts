import { Module } from '@nestjs/common';
import { RecipesController } from './infrastructure/adapters/api/recipes.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RecipeRepository } from './domain/recipe.repository';
import { PrismaRecipeRepository } from './infrastructure/persistence/prisma.recipe.repository';
import { CreateRecipeHandler } from './application/commands/create-recipe.handler';
import { GetRecipesHandler } from './application/queries/get-recipes.handler';
import { GetRecipeHandler } from './application/queries/get-recipe.handler';
import { RecipesService } from './application/recipes.service';
import { PrismaIngredientsAdapter } from './infrastructure/adapters/persistence/prisma-ingredients.adapter';

@Module({
    imports: [PrismaModule],
    controllers: [RecipesController],
    providers: [
        RecipesService,
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
    ],
})
export class RecipesModule { }
