import { Test, TestingModule } from '@nestjs/testing';
import { RecipesController } from './recipes.controller';
import { RecipesService } from '../../application/services/recipes.service';
import { NutritionalValueService } from '../../application/services/nutritional-value.service';
import { CreateRecipeDto } from './dtos/create-recipe.dto';
import { CreateIngredientSectionDto } from './dtos/create-ingredient-section.dto';
import { CreateStepSectionDto, CreateStepDto } from './dtos/create-step-section.dto';
import {
    Recipe,
    TimeUnit,
    ParticularityType,
    RecipeIngredient,
    IngredientSection,
    Step,
    StepSection,
} from '../../domain/entities/recipe.entity';

describe('RecipesController', () => {
    let controller: RecipesController;
    let mockRecipesService: jest.Mocked<RecipesService>;
    let mockNutritionalValueService: jest.Mocked<NutritionalValueService>;

    // Helper to create valid ingredient sections
    const createValidIngredientSections = () => [
        new IngredientSection('Main', null, [new RecipeIngredient(1, '100', 'g')]),
    ];

    // Helper to create valid step sections
    const createValidStepSections = () => [
        new StepSection('Prep', null, [new Step(1, 'Wash', null)]),
    ];

    // Sample test data
    const mockRecipes: Recipe[] = [
        new Recipe(1, 'Pho Bo', 'Soupe Pho', 'Vietnamese soup', 'Soupe vietnamienne', 30, TimeUnit.MINUTES, 120, TimeUnit.MINUTES, 'MEDIUM', 'SOUP', 'VIETNAMESE', 4, 'author-1', createValidIngredientSections(), createValidStepSections()),
        new Recipe(2, 'Banh Mi', 'Sandwich Banh Mi', 'Vietnamese sandwich', 'Sandwich vietnamien', 15, TimeUnit.MINUTES, 0, TimeUnit.MINUTES, 'EASY', 'SANDWICH', 'VIETNAMESE', 2, 'author-2', createValidIngredientSections(), createValidStepSections()),
    ];

    beforeEach(async () => {
        // Create mock services
        mockRecipesService = {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
        } as any;

        mockNutritionalValueService = {
            calculateRecipeNutrition: jest.fn(),
        } as any;

        const module: TestingModule = await Test.createTestingModule({
            controllers: [RecipesController],
            providers: [
                {
                    provide: RecipesService,
                    useValue: mockRecipesService,
                },
                {
                    provide: NutritionalValueService,
                    useValue: mockNutritionalValueService,
                },
            ],
        }).compile();

        controller = module.get<RecipesController>(RecipesController);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should map DTO to command and call service', async () => {
            const dto: CreateRecipeDto = {
                title: 'New Recipe',
                title_fr: 'Nouvelle Recette',
                description: 'A delicious recipe',
                description_fr: 'Une recette délicieuse',
                prepTime: 20,
                prepTimeUnit: TimeUnit.MINUTES,
                cookTime: 30,
                cookTimeUnit: TimeUnit.MINUTES,
                difficulty: 'EASY',
                type: 'MAIN',
                cuisine: 'FRENCH',
                servings: 4,
                authorId: 'author-123',
                ingredientSections: [
                    {
                        name: 'Main Ingredients',
                        name_fr: 'Ingrédients Principaux',
                        ingredients: [
                            { ingredientId: 1, quantity: '100', unit: 'g' },
                            { ingredientId: 2, quantity: '2', unit: 'tbsp' },
                        ],
                    } as CreateIngredientSectionDto,
                ],
                stepSections: [
                    {
                        title: 'Preparation',
                        title_fr: 'Préparation',
                        steps: [
                            { order: 1, description: 'Mix ingredients', description_fr: 'Mélanger les ingrédients' } as CreateStepDto,
                        ],
                    } as CreateStepSectionDto,
                ],
            };

            const expectedRecipe = mockRecipes[0];
            mockRecipesService.create.mockResolvedValue(expectedRecipe);

            const result = await controller.create(dto);

            expect(mockRecipesService.create).toHaveBeenCalledTimes(1);
            expect(result).toEqual(expectedRecipe);

            // Verify the command was created correctly
            const passedCommand = mockRecipesService.create.mock.calls[0][0];
            expect(passedCommand.title).toBe(dto.title);
            expect(passedCommand.ingredientSections).toHaveLength(1);
            expect(passedCommand.ingredientSections[0].ingredients).toHaveLength(2);
        });

        it('should use default TimeUnit.MINUTES when not provided', async () => {
            const dto: CreateRecipeDto = {
                title: 'Simple Recipe',
                description: null,
                prepTime: 10,
                cookTime: 20,
                difficulty: 'EASY',
                type: 'SNACK',
                cuisine: 'GENERAL',
                servings: 2,
                authorId: 'author-123',
                ingredientSections: [
                    {
                        name: 'Main',
                        ingredients: [{ ingredientId: 1, quantity: '100', unit: 'g' }],
                    } as CreateIngredientSectionDto,
                ],
                stepSections: [
                    {
                        title: 'Steps',
                        steps: [{ order: 1, description: 'Mix' } as CreateStepDto],
                    } as CreateStepSectionDto,
                ],
            };

            mockRecipesService.create.mockResolvedValue(mockRecipes[0]);

            await controller.create(dto);

            const passedCommand = mockRecipesService.create.mock.calls[0][0];
            expect(passedCommand.prepTimeUnit).toBe(TimeUnit.MINUTES);
            expect(passedCommand.cookTimeUnit).toBe(TimeUnit.MINUTES);
        });

        it('should handle recipe with particularities', async () => {
            const dto: CreateRecipeDto = {
                title: 'Healthy Recipe',
                description: 'A healthy dish',
                prepTime: 15,
                cookTime: 25,
                difficulty: 'MEDIUM',
                type: 'MAIN',
                cuisine: 'GENERAL',
                servings: 2,
                authorId: 'author-123',
                ingredientSections: [
                    {
                        name: 'Main',
                        ingredients: [{ ingredientId: 1, quantity: '100', unit: 'g' }],
                    } as CreateIngredientSectionDto,
                ],
                stepSections: [
                    {
                        title: 'Steps',
                        steps: [{ order: 1, description: 'Mix' } as CreateStepDto],
                    } as CreateStepSectionDto,
                ],
                particularities: [ParticularityType.VEGAN, ParticularityType.GLUTEN_FREE],
            };

            mockRecipesService.create.mockResolvedValue(mockRecipes[0]);

            await controller.create(dto);

            const passedCommand = mockRecipesService.create.mock.calls[0][0];
            expect(passedCommand.particularities).toEqual([ParticularityType.VEGAN, ParticularityType.GLUTEN_FREE]);
        });
    });

    describe('findAll', () => {
        it('should return all recipes', async () => {
            mockRecipesService.findAll.mockResolvedValue(mockRecipes);

            const result = await controller.findAll();

            expect(mockRecipesService.findAll).toHaveBeenCalledWith();
            expect(mockRecipesService.findAll).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockRecipes);
            expect(result).toHaveLength(2);
        });

        it('should return empty array when no recipes', async () => {
            mockRecipesService.findAll.mockResolvedValue([]);

            const result = await controller.findAll();

            expect(result).toEqual([]);
        });
    });

    describe('findOne', () => {
        it('should parse string ID and return recipe', async () => {
            mockRecipesService.findOne.mockResolvedValue(mockRecipes[0]);

            const result = await controller.findOne('1');

            expect(mockRecipesService.findOne).toHaveBeenCalledWith(1);
            expect(result).toEqual(mockRecipes[0]);
        });

        it('should return null when recipe not found', async () => {
            mockRecipesService.findOne.mockResolvedValue(null);

            const result = await controller.findOne('999');

            expect(mockRecipesService.findOne).toHaveBeenCalledWith(999);
            expect(result).toBeNull();
        });
    });

    describe('getRecipeNutrition', () => {
        it('should call nutritionalValueService.calculateRecipeNutrition', async () => {
            const nutritionResult = {
                perServing: { calories: 350, protein: 25 },
                total: { calories: 1400, protein: 100 },
                servings: 4,
                ingredientsProcessed: 5,
                ingredientsSkipped: [],
            };
            mockNutritionalValueService.calculateRecipeNutrition.mockResolvedValue(nutritionResult as any);

            const result = await controller.getRecipeNutrition('1');

            expect(mockNutritionalValueService.calculateRecipeNutrition).toHaveBeenCalledWith(1);
            expect(result).toEqual(nutritionResult);
        });
    });
});
