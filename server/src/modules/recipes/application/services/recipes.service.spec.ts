import { Test, TestingModule } from '@nestjs/testing';
import { RecipesService } from './recipes.service';
import { CreateRecipeHandler } from '../commands/create-recipe.handler';
import { GetRecipesHandler } from '../queries/get-recipes.handler';
import { GetRecipeHandler } from '../queries/get-recipe.handler';
import {
    Recipe,
    TimeUnit,
    RecipeIngredient,
    IngredientSection,
} from '../../domain/entities/recipe.entity';
import { CreateRecipeCommand } from '../commands/create-recipe.command';

describe('RecipesService', () => {
    let service: RecipesService;
    let mockCreateRecipeHandler: jest.Mocked<CreateRecipeHandler>;
    let mockGetRecipesHandler: jest.Mocked<GetRecipesHandler>;
    let mockGetRecipeHandler: jest.Mocked<GetRecipeHandler>;

    // Helper to create valid ingredient sections
    const createValidIngredientSections = () => [
        new IngredientSection('Main', null, [new RecipeIngredient(1, '100', 'g')]),
    ];

    // Sample test data
    const mockRecipes: Recipe[] = [
        new Recipe(1, 'Pho Bo', 'Soupe Pho', 'Vietnamese soup', 'Soupe vietnamienne', 30, TimeUnit.MINUTES, 120, TimeUnit.HOURS, 'MEDIUM', 'SOUP', 'VIETNAMESE', 4, 'author-1', createValidIngredientSections()),
        new Recipe(2, 'Banh Mi', 'Sandwich Banh Mi', 'Vietnamese sandwich', 'Sandwich vietnamien', 15, TimeUnit.MINUTES, 0, TimeUnit.MINUTES, 'EASY', 'SANDWICH', 'VIETNAMESE', 2, 'author-2', createValidIngredientSections()),
    ];

    beforeEach(async () => {
        // Create mock handlers
        mockCreateRecipeHandler = {
            execute: jest.fn(),
        } as any;

        mockGetRecipesHandler = {
            execute: jest.fn(),
        } as any;

        mockGetRecipeHandler = {
            execute: jest.fn(),
        } as any;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RecipesService,
                {
                    provide: CreateRecipeHandler,
                    useValue: mockCreateRecipeHandler,
                },
                {
                    provide: GetRecipesHandler,
                    useValue: mockGetRecipesHandler,
                },
                {
                    provide: GetRecipeHandler,
                    useValue: mockGetRecipeHandler,
                },
            ],
        }).compile();

        service = module.get<RecipesService>(RecipesService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should delegate to CreateRecipeHandler.execute()', async () => {
            const command = new CreateRecipeCommand(
                'New Recipe',
                'Nouvelle Recette',
                'Description',
                'Description FR',
                20,
                TimeUnit.MINUTES,
                30,
                TimeUnit.MINUTES,
                'EASY',
                'MAIN',
                'FRENCH',
                4,
                'author-123',
                createValidIngredientSections(),
            );
            const expectedRecipe = mockRecipes[0];
            mockCreateRecipeHandler.execute.mockResolvedValue(expectedRecipe);

            const result = await service.create(command);

            expect(mockCreateRecipeHandler.execute).toHaveBeenCalledWith(command);
            expect(mockCreateRecipeHandler.execute).toHaveBeenCalledTimes(1);
            expect(result).toEqual(expectedRecipe);
        });

        it('should propagate errors from handler', async () => {
            const command = new CreateRecipeCommand(
                'New Recipe',
                undefined,
                null,
                undefined,
                20,
                TimeUnit.MINUTES,
                30,
                TimeUnit.MINUTES,
                'EASY',
                'MAIN',
                'FRENCH',
                4,
                'author-123',
                createValidIngredientSections(),
            );
            const error = new Error('Ingredient not found');
            mockCreateRecipeHandler.execute.mockRejectedValue(error);

            await expect(service.create(command)).rejects.toThrow('Ingredient not found');
        });
    });

    describe('findAll', () => {
        it('should delegate to GetRecipesHandler.execute()', async () => {
            mockGetRecipesHandler.execute.mockResolvedValue(mockRecipes);

            const result = await service.findAll();

            expect(mockGetRecipesHandler.execute).toHaveBeenCalledWith();
            expect(mockGetRecipesHandler.execute).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockRecipes);
        });

        it('should return empty array when no recipes exist', async () => {
            mockGetRecipesHandler.execute.mockResolvedValue([]);

            const result = await service.findAll();

            expect(result).toEqual([]);
            expect(result).toHaveLength(0);
        });
    });

    describe('findOne', () => {
        it('should delegate to GetRecipeHandler.execute() with correct id', async () => {
            const expectedRecipe = mockRecipes[0];
            mockGetRecipeHandler.execute.mockResolvedValue(expectedRecipe);

            const result = await service.findOne(1);

            expect(mockGetRecipeHandler.execute).toHaveBeenCalledWith(1);
            expect(mockGetRecipeHandler.execute).toHaveBeenCalledTimes(1);
            expect(result).toEqual(expectedRecipe);
        });

        it('should return null when recipe not found', async () => {
            mockGetRecipeHandler.execute.mockResolvedValue(null);

            const result = await service.findOne(999);

            expect(mockGetRecipeHandler.execute).toHaveBeenCalledWith(999);
            expect(result).toBeNull();
        });
    });
});
