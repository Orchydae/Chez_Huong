import { Test, TestingModule } from '@nestjs/testing';
import { GetRecipeHandler } from './get-recipe.handler';
import { IRecipesRepository } from '../../domain/ports/recipe.port';
import {
    Recipe,
    TimeUnit,
    ParticularityType,
    RecipeIngredient,
    IngredientSection,
} from '../../domain/entities/recipe.entity';

describe('GetRecipeHandler', () => {
    let handler: GetRecipeHandler;
    let mockRecipeRepository: jest.Mocked<IRecipesRepository>;

    // Helper to create valid ingredient sections
    const createValidIngredientSections = () => [
        new IngredientSection('Main', null, [new RecipeIngredient(1, '100', 'g')]),
    ];

    // Sample test data
    const mockRecipe = new Recipe(
        1,
        'Pho Bo',
        'Soupe Pho au Boeuf',
        'Traditional Vietnamese beef noodle soup',
        'Soupe traditionnelle vietnamienne au boeuf',
        30,
        TimeUnit.MINUTES,
        120,
        TimeUnit.MINUTES,
        'MEDIUM',
        'SOUP',
        'VIETNAMESE',
        4,
        'author-uuid-123',
        createValidIngredientSections(),
        undefined,
        { calories: 350, protein: 25 },
        [ParticularityType.GLUTEN_FREE],
    );

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
                GetRecipeHandler,
                {
                    provide: IRecipesRepository,
                    useValue: mockRecipeRepository,
                },
            ],
        }).compile();

        handler = module.get<GetRecipeHandler>(GetRecipeHandler);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('execute', () => {
        it('should return recipe when found', async () => {
            mockRecipeRepository.findById.mockResolvedValue(mockRecipe);

            const result = await handler.execute(1);

            expect(mockRecipeRepository.findById).toHaveBeenCalledWith(1);
            expect(mockRecipeRepository.findById).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockRecipe);
        });

        it('should return null when recipe not found', async () => {
            mockRecipeRepository.findById.mockResolvedValue(null);

            const result = await handler.execute(999);

            expect(mockRecipeRepository.findById).toHaveBeenCalledWith(999);
            expect(result).toBeNull();
        });

        it('should pass correct ID to repository', async () => {
            mockRecipeRepository.findById.mockResolvedValue(null);

            await handler.execute(42);

            expect(mockRecipeRepository.findById).toHaveBeenCalledWith(42);
        });

        it('should return recipe with all properties including optional ones', async () => {
            mockRecipeRepository.findById.mockResolvedValue(mockRecipe);

            const result = await handler.execute(1);

            expect(result).not.toBeNull();
            expect(result!.id).toBe(1);
            expect(result!.title).toBe('Pho Bo');
            expect(result!.ingredientSections).toHaveLength(1);
            expect(result!.nutritionalInfo?.calories).toBe(350);
            expect(result!.particularities).toContain(ParticularityType.GLUTEN_FREE);
        });

        it('should propagate repository errors', async () => {
            const error = new Error('Database connection failed');
            mockRecipeRepository.findById.mockRejectedValue(error);

            await expect(handler.execute(1)).rejects.toThrow('Database connection failed');
        });

        it('should handle recipe without optional nutritional info', async () => {
            const recipeWithoutNutrition = new Recipe(
                2,
                'Simple Recipe',
                null,
                'A simple recipe',
                null,
                10,
                TimeUnit.MINUTES,
                20,
                TimeUnit.MINUTES,
                'EASY',
                'MAIN',
                'GENERAL',
                2,
                'author-123',
                createValidIngredientSections(),
            );
            mockRecipeRepository.findById.mockResolvedValue(recipeWithoutNutrition);

            const result = await handler.execute(2);

            expect(result).not.toBeNull();
            expect(result!.nutritionalInfo).toBeUndefined();
            expect(result!.particularities).toBeUndefined();
        });
    });
});
