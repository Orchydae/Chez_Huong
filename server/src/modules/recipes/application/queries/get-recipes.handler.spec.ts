import { Test, TestingModule } from '@nestjs/testing';
import { GetRecipesHandler } from './get-recipes.handler';
import { IRecipesRepository } from '../../domain/ports/recipe.port';
import {
    Recipe,
    TimeUnit,
    RecipeIngredient,
    IngredientSection,
} from '../../domain/entities/recipe.entity';

describe('GetRecipesHandler', () => {
    let handler: GetRecipesHandler;
    let mockRecipeRepository: jest.Mocked<IRecipesRepository>;

    // Helper to create valid ingredient sections
    const createValidIngredientSections = () => [
        new IngredientSection('Main', null, [new RecipeIngredient(1, '100', 'g')]),
    ];

    // Sample test data
    const mockRecipes: Recipe[] = [
        new Recipe(1, 'Pho Bo', 'Soupe Pho', 'Vietnamese soup', 'Soupe vietnamienne', 30, TimeUnit.MINUTES, 120, TimeUnit.MINUTES, 'MEDIUM', 'SOUP', 'VIETNAMESE', 4, 'author-1', createValidIngredientSections()),
        new Recipe(2, 'Banh Mi', 'Sandwich Banh Mi', 'Vietnamese sandwich', 'Sandwich vietnamien', 15, TimeUnit.MINUTES, 0, TimeUnit.MINUTES, 'EASY', 'SANDWICH', 'VIETNAMESE', 2, 'author-2', createValidIngredientSections()),
        new Recipe(3, 'Com Tam', 'Riz Brisé', 'Broken rice dish', 'Plat de riz brisé', 20, TimeUnit.MINUTES, 25, TimeUnit.MINUTES, 'EASY', 'MAIN', 'VIETNAMESE', 1, 'author-1', createValidIngredientSections()),
    ];

    beforeEach(async () => {
        // Create mock repository
        mockRecipeRepository = {
            findAll: jest.fn(),
            findById: jest.fn(),
            save: jest.fn(),
            getRecipeIngredientsWithNutrition: jest.fn(),
            getRecipeServings: jest.fn(),
            saveNutritionalInfo: jest.fn(),
        } as any;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GetRecipesHandler,
                {
                    provide: IRecipesRepository,
                    useValue: mockRecipeRepository,
                },
            ],
        }).compile();

        handler = module.get<GetRecipesHandler>(GetRecipesHandler);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('execute', () => {
        it('should return all recipes from repository', async () => {
            mockRecipeRepository.findAll.mockResolvedValue(mockRecipes);

            const result = await handler.execute();

            expect(mockRecipeRepository.findAll).toHaveBeenCalledWith();
            expect(mockRecipeRepository.findAll).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockRecipes);
            expect(result).toHaveLength(3);
        });

        it('should return empty array when no recipes exist', async () => {
            mockRecipeRepository.findAll.mockResolvedValue([]);

            const result = await handler.execute();

            expect(mockRecipeRepository.findAll).toHaveBeenCalled();
            expect(result).toEqual([]);
            expect(result).toHaveLength(0);
        });

        it('should propagate repository errors', async () => {
            const error = new Error('Database connection failed');
            mockRecipeRepository.findAll.mockRejectedValue(error);

            await expect(handler.execute()).rejects.toThrow('Database connection failed');
        });

        it('should return recipes with all properties intact', async () => {
            mockRecipeRepository.findAll.mockResolvedValue([mockRecipes[0]]);

            const result = await handler.execute();

            expect(result[0].id).toBe(1);
            expect(result[0].title).toBe('Pho Bo');
            expect(result[0].title_fr).toBe('Soupe Pho');
            expect(result[0].ingredientSections).toHaveLength(1);
        });
    });
});
