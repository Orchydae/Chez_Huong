import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CreateRecipeHandler } from './create-recipe.handler';
import { CreateRecipeCommand } from './create-recipe.command';
import { IRecipesRepository } from '../../domain/ports/recipe.port';
import { IIngredientsRepository } from '../../domain/ports/ingredients.port';
import {
    Recipe,
    TimeUnit,
    ParticularityType,
    RecipeIngredient,
    IngredientSection,
    Step,
    StepSection,
} from '../../domain/entities/recipe.entity';

describe('CreateRecipeHandler', () => {
    let handler: CreateRecipeHandler;
    let mockRecipeRepository: jest.Mocked<IRecipesRepository>;
    let mockIngredientsRepository: jest.Mocked<IIngredientsRepository>;

    beforeEach(async () => {
        // Create mock repositories
        mockRecipeRepository = {
            findAll: jest.fn(),
            findById: jest.fn(),
            save: jest.fn(),
            getRecipeIngredientsWithNutrition: jest.fn(),
            getRecipeServings: jest.fn(),
        } as any;

        mockIngredientsRepository = {
            findMissingIngredients: jest.fn(),
        } as any;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CreateRecipeHandler,
                {
                    provide: IRecipesRepository,
                    useValue: mockRecipeRepository,
                },
                {
                    provide: IIngredientsRepository,
                    useValue: mockIngredientsRepository,
                },
            ],
        }).compile();

        handler = module.get<CreateRecipeHandler>(CreateRecipeHandler);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // Helper to create valid ingredient sections
    const createValidIngredientSections = () => [
        new IngredientSection('Broth', [
            new RecipeIngredient(1, '2', 'kg'),
            new RecipeIngredient(2, '1', 'piece'),
        ]),
        new IngredientSection('Noodles', [
            new RecipeIngredient(3, '500', 'g'),
        ]),
    ];

    // Helper to create valid step sections
    const createValidStepSections = () => [
        new StepSection('Preparation', [
            new Step(1, 'Prepare beef bones'),
            new Step(2, 'Simmer broth'),
        ]),
    ];

    const createValidCommand = (): CreateRecipeCommand => {
        return new CreateRecipeCommand(
            'Pho Bo',
            'Traditional Vietnamese beef noodle soup',
            'vi',
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
            createValidStepSections(),
            [ParticularityType.GLUTEN_FREE],
        );
    };

    describe('execute', () => {
        it('should create recipe successfully when all ingredients exist', async () => {
            const command = createValidCommand();

            mockIngredientsRepository.findMissingIngredients.mockResolvedValue([]);
            mockRecipeRepository.save.mockImplementation(async (recipe) => recipe);

            const result = await handler.execute(command);

            expect(mockIngredientsRepository.findMissingIngredients).toHaveBeenCalledWith([1, 2, 3]);
            expect(mockRecipeRepository.save).toHaveBeenCalled();
            expect(result.title).toBe('Pho Bo');
            expect(result.ingredientSections).toHaveLength(2);
        });

        it('should throw BadRequestException when ingredients do not exist', async () => {
            const command = createValidCommand();
            mockIngredientsRepository.findMissingIngredients.mockResolvedValue([2, 3]);

            await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
            await expect(handler.execute(command)).rejects.toThrow(
                'The following ingredient IDs do not exist: 2, 3',
            );
            expect(mockRecipeRepository.save).not.toHaveBeenCalled();
        });

        it('should extract all ingredient IDs from all sections', async () => {
            const ingredientSections = [
                new IngredientSection('Section 1', [
                    new RecipeIngredient(10, '1', 'cup'),
                    new RecipeIngredient(20, '2', 'tbsp'),
                ]),
                new IngredientSection('Section 2', [
                    new RecipeIngredient(30, '3', 'pieces'),
                ]),
                new IngredientSection('Section 3', [
                    new RecipeIngredient(40, '100', 'g'),
                    new RecipeIngredient(50, '50', 'ml'),
                ]),
            ];

            const command = new CreateRecipeCommand(
                'Multi-section Recipe',
                null,
                'en',
                10,
                TimeUnit.MINUTES,
                20,
                TimeUnit.MINUTES,
                'EASY',
                'MAIN',
                'FRENCH',
                2,
                'author-123',
                ingredientSections,
                createValidStepSections(),
            );

            mockIngredientsRepository.findMissingIngredients.mockResolvedValue([]);
            mockRecipeRepository.save.mockImplementation(async (recipe) => recipe);

            await handler.execute(command);

            expect(mockIngredientsRepository.findMissingIngredients).toHaveBeenCalledWith([10, 20, 30, 40, 50]);
        });

        it('should throw BadRequestException for empty ingredient sections', async () => {
            const command = new CreateRecipeCommand(
                'Empty Recipe',
                null,
                'en',
                10,
                TimeUnit.MINUTES,
                20,
                TimeUnit.MINUTES,
                'EASY',
                'MAIN',
                'GENERAL',
                2,
                'author-123',
                [], // Empty ingredient sections - will fail domain validation
                createValidStepSections(),
            );

            mockIngredientsRepository.findMissingIngredients.mockResolvedValue([]);

            await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
            await expect(handler.execute(command)).rejects.toThrow(
                'Recipe must have at least one ingredient section',
            );
        });

        it('should throw BadRequestException for empty step sections array', async () => {
            const command = new CreateRecipeCommand(
                'Recipe with empty steps',
                null,
                'en',
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
                [], // Empty step sections array - will fail domain validation
            );

            mockIngredientsRepository.findMissingIngredients.mockResolvedValue([]);

            await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
            await expect(handler.execute(command)).rejects.toThrow(
                'Recipe must have at least one step section',
            );
        });

        it('should handle command without optional nutritional info and particularities', async () => {
            const command = new CreateRecipeCommand(
                'Minimal Recipe',
                null,
                'en',
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
                createValidStepSections(),
                undefined, // No particularities
            );

            mockIngredientsRepository.findMissingIngredients.mockResolvedValue([]);
            mockRecipeRepository.save.mockImplementation(async (recipe) => recipe);

            const result = await handler.execute(command);

            expect(result.locale).toBe('en');
            expect(result.stepSections).toHaveLength(1);
        });
    });
});
