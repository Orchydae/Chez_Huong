import { Test, TestingModule } from '@nestjs/testing';
import { NutritionalValueService, CalculationResult } from './nutritional-value.service';
import { IIngredientsRepository } from '../../domain/ports/ingredients.port';
import { IRecipesRepository, RecipeIngredientWithNutrition } from '../../domain/ports/recipe.port';
import { NutrientValues, NUTRIENT_KEYS } from '../../domain/entities/nutrient-values.interface';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Build a full NutrientValues object for a given calorie baseline. */
function makeNutrition(overrides: Partial<NutrientValues> = {}): NutrientValues & { servingSize: number | null } {
    return {
        calories: 100,
        protein: 10,
        carbohydrates: 20,
        fiber: 2,
        sugar: 5,
        totalFat: 3,
        saturatedFat: 1,
        monounsatFat: 1,
        polyunsatFat: 1,
        transFat: 0,
        cholesterol: 0,
        sodium: 50,
        potassium: 150,
        calcium: 20,
        iron: 1,
        magnesium: 10,
        zinc: 0.5,
        vitaminA: 5,
        vitaminC: 2,
        vitaminD: 0,
        vitaminE: 0.5,
        vitaminK: 2,
        vitaminB6: 0.1,
        vitaminB12: 0,
        folate: 10,
        servingSize: null,
        ...overrides,
    };
}

/** Build a RecipeIngredientWithNutrition row with data per 100 g. */
function makeIngredient(
    ingredientId: number,
    quantity: string,
    unit: string,
    nutritionOverrides?: Partial<NutrientValues> | null,
): RecipeIngredientWithNutrition {
    return {
        ingredientId,
        quantity,
        unit,
        nutrition: nutritionOverrides === null ? null : makeNutrition(nutritionOverrides),
    };
}

// ─── Test suite ─────────────────────────────────────────────────────────────

describe('NutritionalValueService', () => {
    let service: NutritionalValueService;
    let mockIngredientsRepository: jest.Mocked<IIngredientsRepository>;
    let mockRecipesRepository: jest.Mocked<IRecipesRepository>;

    beforeEach(async () => {
        mockIngredientsRepository = {
            findMissingIngredients: jest.fn(),
            findByName: jest.fn(),
            searchByName: jest.fn(),
            findByFdcId: jest.fn(),
            create: jest.fn(),
            findAll: jest.fn(),
            findAllWithNutrition: jest.fn(),
            findByIdWithNutrition: jest.fn(),
            saveNutrition: jest.fn(),
            savePendingMatches: jest.fn(),
            getPendingMatches: jest.fn(),
            clearPendingMatches: jest.fn(),
            savePortions: jest.fn(),
            getPortions: jest.fn(),
            getPortionByName: jest.fn(),
        } as any;

        mockRecipesRepository = {
            findAll: jest.fn(),
            findById: jest.fn(),
            save: jest.fn(),
            getRecipeIngredientsWithNutrition: jest.fn(),
            getRecipeServings: jest.fn(),
        } as any;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NutritionalValueService,
                { provide: IIngredientsRepository, useValue: mockIngredientsRepository },
                { provide: IRecipesRepository, useValue: mockRecipesRepository },
            ],
        }).compile();

        service = module.get<NutritionalValueService>(NutritionalValueService);
    });

    afterEach(() => jest.clearAllMocks());

    // =========================================================================
    // parseQuantity
    // =========================================================================
    describe('parseQuantity', () => {
        it('should parse integer strings', () => {
            expect(service.parseQuantity('2')).toBe(2);
            expect(service.parseQuantity('100')).toBe(100);
        });

        it('should parse decimal strings', () => {
            expect(service.parseQuantity('0.5')).toBeCloseTo(0.5);
            expect(service.parseQuantity('1.25')).toBeCloseTo(1.25);
        });

        it('should parse simple fraction strings', () => {
            expect(service.parseQuantity('1/2')).toBeCloseTo(0.5);
            expect(service.parseQuantity('1/4')).toBeCloseTo(0.25);
            expect(service.parseQuantity('3/4')).toBeCloseTo(0.75);
        });

        it('should parse mixed fraction strings', () => {
            expect(service.parseQuantity('1 1/2')).toBeCloseTo(1.5);
            expect(service.parseQuantity('2 3/4')).toBeCloseTo(2.75);
        });

        it('should parse range strings as the average', () => {
            expect(service.parseQuantity('2-3')).toBeCloseTo(2.5);
            expect(service.parseQuantity('1-2')).toBeCloseTo(1.5);
        });

        it('should return 0 for non-numeric strings', () => {
            expect(service.parseQuantity('as needed')).toBe(0);
            expect(service.parseQuantity('')).toBe(0);
        });

        it('should trim whitespace before parsing', () => {
            expect(service.parseQuantity('  2  ')).toBe(2);
            expect(service.parseQuantity(' 1/2 ')).toBeCloseTo(0.5);
        });
    });

    // =========================================================================
    // normalizeUnit
    // =========================================================================
    describe('normalizeUnit', () => {
        it('should normalize plural aliases to singular', () => {
            expect(service.normalizeUnit('cups')).toBe('cup');
            expect(service.normalizeUnit('tablespoons')).toBe('tbsp');
            expect(service.normalizeUnit('teaspoons')).toBe('tsp');
            expect(service.normalizeUnit('grams')).toBe('g');
            expect(service.normalizeUnit('kilograms')).toBe('kg');
            expect(service.normalizeUnit('ounces')).toBe('oz');
            expect(service.normalizeUnit('pounds')).toBe('lb');
            expect(service.normalizeUnit('lbs')).toBe('lb');
            expect(service.normalizeUnit('liters')).toBe('l');
            expect(service.normalizeUnit('milliliters')).toBe('ml');
        });

        it('should lowercase the unit', () => {
            expect(service.normalizeUnit('G')).toBe('g');
            expect(service.normalizeUnit('Cup')).toBe('cup');
        });

        it('should trim whitespace from unit', () => {
            expect(service.normalizeUnit(' g ')).toBe('g');
        });

        it('should return unknown units unchanged (lowercased)', () => {
            expect(service.normalizeUnit('piece')).toBe('piece');
            expect(service.normalizeUnit('bunch')).toBe('bunch');
        });
    });

    // =========================================================================
    // isWeightUnit / isVolumeUnit / isNegligibleUnit
    // =========================================================================
    describe('unit classification', () => {
        describe('isWeightUnit', () => {
            it('should return true for weight units', () => {
                expect(service.isWeightUnit('g')).toBe(true);
                expect(service.isWeightUnit('kg')).toBe(true);
                expect(service.isWeightUnit('oz')).toBe(true);
                expect(service.isWeightUnit('lb')).toBe(true);
            });

            it('should return false for non-weight units', () => {
                expect(service.isWeightUnit('cup')).toBe(false);
                expect(service.isWeightUnit('piece')).toBe(false);
            });
        });

        describe('isVolumeUnit', () => {
            it('should return true for volume units', () => {
                expect(service.isVolumeUnit('cup')).toBe(true);
                expect(service.isVolumeUnit('tbsp')).toBe(true);
                expect(service.isVolumeUnit('tsp')).toBe(true);
                expect(service.isVolumeUnit('ml')).toBe(true);
                expect(service.isVolumeUnit('l')).toBe(true);
            });

            it('should return false for non-volume units', () => {
                expect(service.isVolumeUnit('g')).toBe(false);
                expect(service.isVolumeUnit('piece')).toBe(false);
            });
        });

        describe('isNegligibleUnit', () => {
            it('should return true for negligible units', () => {
                expect(service.isNegligibleUnit('pinch')).toBe(true);
                expect(service.isNegligibleUnit('dash')).toBe(true);
                expect(service.isNegligibleUnit('to taste')).toBe(true);
                expect(service.isNegligibleUnit('as needed')).toBe(true);
            });

            it('should return false for non-negligible units', () => {
                expect(service.isNegligibleUnit('g')).toBe(false);
                expect(service.isNegligibleUnit('cup')).toBe(false);
            });
        });
    });

    // =========================================================================
    // weightToGrams / volumeToMl
    // =========================================================================
    describe('unit conversions', () => {
        describe('weightToGrams', () => {
            it('should convert grams to grams (factor 1)', () => {
                expect(service.weightToGrams(100, 'g')).toBe(100);
            });

            it('should convert kg to grams', () => {
                expect(service.weightToGrams(1, 'kg')).toBe(1000);
                expect(service.weightToGrams(2, 'kg')).toBe(2000);
            });

            it('should convert oz to grams', () => {
                expect(service.weightToGrams(1, 'oz')).toBeCloseTo(28.35);
            });

            it('should convert lb to grams', () => {
                expect(service.weightToGrams(1, 'lb')).toBeCloseTo(453.59);
            });

            it('should return 0 for unknown units', () => {
                expect(service.weightToGrams(1, 'unknown')).toBe(0);
            });
        });

        describe('volumeToMl', () => {
            it('should convert cup to ml', () => {
                expect(service.volumeToMl(1, 'cup')).toBe(240);
                expect(service.volumeToMl(0.5, 'cup')).toBe(120);
            });

            it('should convert tbsp to ml', () => {
                expect(service.volumeToMl(1, 'tbsp')).toBe(15);
            });

            it('should convert tsp to ml', () => {
                expect(service.volumeToMl(1, 'tsp')).toBe(5);
            });

            it('should convert l to ml', () => {
                expect(service.volumeToMl(1, 'l')).toBe(1000);
            });

            it('should return ml unchanged (factor 1)', () => {
                expect(service.volumeToMl(250, 'ml')).toBe(250);
            });

            it('should return 0 for unknown units', () => {
                expect(service.volumeToMl(1, 'unknown')).toBe(0);
            });
        });
    });

    // =========================================================================
    // convertToGrams
    // =========================================================================
    describe('convertToGrams', () => {
        beforeEach(() => {
            // By default, no USDA portion data
            mockIngredientsRepository.getPortionByName.mockResolvedValue(null);
        });

        it('should directly convert weight units to grams', async () => {
            const result = await service.convertToGrams(1, '100', 'g');
            expect(result).toBe(100);
            expect(mockIngredientsRepository.getPortionByName).not.toHaveBeenCalled();
        });

        it('should convert kg to grams', async () => {
            const result = await service.convertToGrams(1, '2', 'kg');
            expect(result).toBe(2000);
        });

        it('should return 0 for negligible units (pinch, dash)', async () => {
            expect(await service.convertToGrams(1, '1', 'pinch')).toBe(0);
            expect(await service.convertToGrams(1, '1', 'dash')).toBe(0);
        });

        it('should use USDA portion data when available (volume unit)', async () => {
            // "1 cup" of flour has USDA gramWeight of 125g
            mockIngredientsRepository.getPortionByName.mockResolvedValue({ gramWeight: 125 });

            const result = await service.convertToGrams(1, '1', 'cup');
            expect(result).toBe(125);
            expect(mockIngredientsRepository.getPortionByName).toHaveBeenCalledWith(1, 'cup');
        });

        it('should fall back to volumeToMl (1g=1ml) when no USDA portion data', async () => {
            mockIngredientsRepository.getPortionByName.mockResolvedValue(null);

            // 1 cup = 240ml = 240g (water density fallback)
            const result = await service.convertToGrams(1, '1', 'cup');
            expect(result).toBe(240);
        });

        it('should handle fractional quantities with weight units', async () => {
            const result = await service.convertToGrams(1, '1/2', 'kg');
            expect(result).toBe(500);
        });

        it('should return 0 when quantity parses to 0', async () => {
            const result = await service.convertToGrams(1, '0', 'g');
            expect(result).toBe(0);
        });

        it('should normalize plural aliases before lookup', async () => {
            mockIngredientsRepository.getPortionByName.mockResolvedValue(null);

            // "cups" should normalize to "cup" before USDA lookup and fallback
            await service.convertToGrams(1, '2', 'cups');
            expect(mockIngredientsRepository.getPortionByName).toHaveBeenCalledWith(1, 'cup');
        });

        it('should use USDA portion for count-based units (e.g. "piece")', async () => {
            mockIngredientsRepository.getPortionByName.mockResolvedValue({ gramWeight: 60 });

            const result = await service.convertToGrams(1, '2', 'piece');
            expect(result).toBe(120); // 2 × 60g
        });

        it('should return 0 when count-based unit has no USDA data', async () => {
            mockIngredientsRepository.getPortionByName.mockResolvedValue(null);

            const result = await service.convertToGrams(1, '2', 'piece');
            expect(result).toBe(0);
        });
    });

    // =========================================================================
    // createEmptyNutrition
    // =========================================================================
    describe('createEmptyNutrition', () => {
        it('should return an object with all NUTRIENT_KEYS set to 0', () => {
            const empty = service.createEmptyNutrition();

            expect(Object.keys(empty)).toHaveLength(NUTRIENT_KEYS.length);
            for (const key of NUTRIENT_KEYS) {
                expect(empty[key]).toBe(0);
            }
        });
    });

    // =========================================================================
    // addNutrition
    // =========================================================================
    describe('addNutrition', () => {
        it('should add two nutrition objects together', () => {
            const a = service.createEmptyNutrition();
            a.calories = 100;
            a.protein = 20;

            const b: Partial<NutrientValues> = { calories: 50, protein: 10 };

            const result = service.addNutrition(a, b);
            expect(result.calories).toBe(150);
            expect(result.protein).toBe(30);
        });

        it('should treat missing keys in b as 0', () => {
            const a = service.createEmptyNutrition();
            a.calories = 100;

            const result = service.addNutrition(a, {});
            expect(result.calories).toBe(100);
        });

        it('should treat null values in b as 0', () => {
            const a = service.createEmptyNutrition();
            a.calories = 200;

            const result = service.addNutrition(a, { calories: null });
            expect(result.calories).toBe(200);
        });
    });

    // =========================================================================
    // scaleNutrition
    // =========================================================================
    describe('scaleNutrition', () => {
        it('should scale all nutrient values by the given factor', () => {
            const nutrition: Partial<NutrientValues> = { calories: 100, protein: 20 };

            const result = service.scaleNutrition(nutrition, 2);
            expect(result.calories).toBe(200);
            expect(result.protein).toBe(40);
        });

        it('should handle factor 0 (no quantity)', () => {
            const nutrition: Partial<NutrientValues> = { calories: 100, protein: 20 };

            const result = service.scaleNutrition(nutrition, 0);
            expect(result.calories).toBe(0);
            expect(result.protein).toBe(0);
        });

        it('should handle fractional factors (e.g. 50g of a 100g-base ingredient)', () => {
            const nutrition: Partial<NutrientValues> = { calories: 200, protein: 10 };

            const result = service.scaleNutrition(nutrition, 0.5);
            expect(result.calories).toBeCloseTo(100);
            expect(result.protein).toBeCloseTo(5);
        });

        it('should treat null nutrient values as 0', () => {
            const nutrition: Partial<NutrientValues> = { calories: null };

            const result = service.scaleNutrition(nutrition, 2);
            expect(result.calories).toBe(0);
        });
    });

    // =========================================================================
    // divideByServings
    // =========================================================================
    describe('divideByServings', () => {
        it('should divide all nutrients by the number of servings', () => {
            const total = service.createEmptyNutrition();
            total.calories = 800;
            total.protein = 40;

            const perServing = service.divideByServings(total, 4);
            expect(perServing.calories).toBe(200);
            expect(perServing.protein).toBe(10);
        });

        it('should default to 1 serving if servings is 0', () => {
            const total = service.createEmptyNutrition();
            total.calories = 500;

            const result = service.divideByServings(total, 0);
            expect(result.calories).toBe(500);
        });

        it('should default to 1 serving if servings is negative', () => {
            const total = service.createEmptyNutrition();
            total.calories = 500;

            const result = service.divideByServings(total, -1);
            expect(result.calories).toBe(500);
        });
    });

    // =========================================================================
    // calculateRecipeNutrition — the main pipeline
    // =========================================================================
    describe('calculateRecipeNutrition', () => {
        beforeEach(() => {
            // Default: no USDA portion data unless overridden per test
            mockIngredientsRepository.getPortionByName.mockResolvedValue(null);
        });

        it('should return zeroed nutrition when there are no ingredients', async () => {
            mockRecipesRepository.getRecipeIngredientsWithNutrition.mockResolvedValue([]);
            mockRecipesRepository.getRecipeServings.mockResolvedValue(4);

            const result = await service.calculateRecipeNutrition(1);

            expect(result.servings).toBe(4);
            expect(result.ingredientsProcessed).toBe(0);
            expect(result.ingredientsSkipped).toHaveLength(0);
            expect(result.total.calories).toBe(0);
            expect(result.perServing.calories).toBe(0);
        });

        it('should correctly calculate total and per-serving for a single weight ingredient', async () => {
            // Ingredient: 200g | nutrition baseline is per 100g
            // 200g = factor 2x => calories: 100 × 2 = 200 total, ÷4 servings = 50 per serving
            mockRecipesRepository.getRecipeIngredientsWithNutrition.mockResolvedValue([
                makeIngredient(1, '200', 'g', { calories: 100 }),
            ]);
            mockRecipesRepository.getRecipeServings.mockResolvedValue(4);

            const result = await service.calculateRecipeNutrition(1);

            expect(result.ingredientsProcessed).toBe(1);
            expect(result.ingredientsSkipped).toHaveLength(0);
            expect(result.total.calories).toBeCloseTo(200);
            expect(result.perServing.calories).toBeCloseTo(50);
        });

        it('should skip ingredients with null nutrition data', async () => {
            mockRecipesRepository.getRecipeIngredientsWithNutrition.mockResolvedValue([
                makeIngredient(1, '100', 'g', { calories: 200 }),
                makeIngredient(2, '100', 'g', null), // no nutrition data
            ]);
            mockRecipesRepository.getRecipeServings.mockResolvedValue(1);

            const result = await service.calculateRecipeNutrition(1);

            expect(result.ingredientsProcessed).toBe(1);
            expect(result.ingredientsSkipped).toHaveLength(1);
            expect(result.ingredientsSkipped[0]).toMatch(/2/); // contains ingredient id 2
            expect(result.total.calories).toBeCloseTo(200);
        });

        it('should skip ingredients whose quantity cannot be converted to grams', async () => {
            // "piece" with no USDA portion data → convertToGrams returns 0
            mockIngredientsRepository.getPortionByName.mockResolvedValue(null);

            mockRecipesRepository.getRecipeIngredientsWithNutrition.mockResolvedValue([
                makeIngredient(1, '2', 'piece', { calories: 100 }),
            ]);
            mockRecipesRepository.getRecipeServings.mockResolvedValue(1);

            const result = await service.calculateRecipeNutrition(1);

            expect(result.ingredientsProcessed).toBe(0);
            expect(result.ingredientsSkipped).toHaveLength(1);
            expect(result.total.calories).toBe(0);
        });

        it('should sum nutrition from multiple convertible ingredients', async () => {
            // Ingredient A: 100g with 200 kcal, factor 1 → 200 kcal
            // Ingredient B: 200g with 100 kcal, factor 2 → 200 kcal
            // Total calories → 400, ÷ 2 servings → 200 per serving
            mockRecipesRepository.getRecipeIngredientsWithNutrition.mockResolvedValue([
                makeIngredient(1, '100', 'g', { calories: 200, protein: 10 }),
                makeIngredient(2, '200', 'g', { calories: 100, protein: 5 }),
            ]);
            mockRecipesRepository.getRecipeServings.mockResolvedValue(2);

            const result = await service.calculateRecipeNutrition(1);

            expect(result.ingredientsProcessed).toBe(2);
            expect(result.total.calories).toBeCloseTo(400);
            expect(result.perServing.calories).toBeCloseTo(200);
            // protein: 100g×10/100 + 200g×5/100 = 10 + 10 = 20 total, 10 per serving
            expect(result.total.protein).toBeCloseTo(20);
            expect(result.perServing.protein).toBeCloseTo(10);
        });

        it('should skip negligible unit ingredients and include them in skipped list', async () => {
            mockRecipesRepository.getRecipeIngredientsWithNutrition.mockResolvedValue([
                makeIngredient(1, '100', 'g', { calories: 200 }),
                makeIngredient(2, '1', 'pinch', { calories: 999 }), // negligible → 0g → skipped
            ]);
            mockRecipesRepository.getRecipeServings.mockResolvedValue(1);

            const result = await service.calculateRecipeNutrition(1);

            expect(result.ingredientsProcessed).toBe(1);
            expect(result.ingredientsSkipped).toHaveLength(1);
            expect(result.total.calories).toBeCloseTo(200);
        });

        it('should handle all ingredients having no nutrition data (100% missing)', async () => {
            mockRecipesRepository.getRecipeIngredientsWithNutrition.mockResolvedValue([
                makeIngredient(1, '100', 'g', null),
                makeIngredient(2, '200', 'g', null),
            ]);
            mockRecipesRepository.getRecipeServings.mockResolvedValue(4);

            const result = await service.calculateRecipeNutrition(1);

            expect(result.ingredientsProcessed).toBe(0);
            expect(result.ingredientsSkipped).toHaveLength(2);
            expect(result.total.calories).toBe(0);
            expect(result.perServing.calories).toBe(0);
        });

        it('should default servings to 1 when repository returns null', async () => {
            mockRecipesRepository.getRecipeIngredientsWithNutrition.mockResolvedValue([
                makeIngredient(1, '100', 'g', { calories: 400 }),
            ]);
            mockRecipesRepository.getRecipeServings.mockResolvedValue(null);

            const result = await service.calculateRecipeNutrition(1);

            expect(result.servings).toBe(1);
            expect(result.total.calories).toBeCloseTo(400);
            expect(result.perServing.calories).toBeCloseTo(400); // same as total when 1 serving
        });

        it('should propagate all 25 nutrient fields in total and perServing', async () => {
            mockRecipesRepository.getRecipeIngredientsWithNutrition.mockResolvedValue([
                makeIngredient(1, '100', 'g'), // uses default makeNutrition values
            ]);
            mockRecipesRepository.getRecipeServings.mockResolvedValue(1);

            const result = await service.calculateRecipeNutrition(1);

            const totalKeys = Object.keys(result.total);
            const perServingKeys = Object.keys(result.perServing);

            expect(totalKeys).toHaveLength(NUTRIENT_KEYS.length);
            expect(perServingKeys).toHaveLength(NUTRIENT_KEYS.length);

            for (const key of NUTRIENT_KEYS) {
                expect(typeof result.total[key]).toBe('number');
                expect(typeof result.perServing[key]).toBe('number');
            }
        });

        it('should use USDA portion data for volume ingredients when available', async () => {
            // "1 cup" of cream has USDA portion data: 240g
            mockIngredientsRepository.getPortionByName.mockResolvedValue({ gramWeight: 240 });

            mockRecipesRepository.getRecipeIngredientsWithNutrition.mockResolvedValue([
                makeIngredient(1, '1', 'cup', { calories: 150 }),
            ]);
            mockRecipesRepository.getRecipeServings.mockResolvedValue(1);

            const result = await service.calculateRecipeNutrition(1);

            // 240g × (150 calories per 100g) = 360 calories
            expect(result.total.calories).toBeCloseTo(360);
        });

        it('should handle fractional quantities in a full pipeline (e.g. 1/2 kg of beef)', async () => {
            mockRecipesRepository.getRecipeIngredientsWithNutrition.mockResolvedValue([
                makeIngredient(1, '1/2', 'kg', { calories: 200 }), // 500g × 2 = 1000 cal
            ]);
            mockRecipesRepository.getRecipeServings.mockResolvedValue(2);

            const result = await service.calculateRecipeNutrition(1);

            expect(result.total.calories).toBeCloseTo(1000);
            expect(result.perServing.calories).toBeCloseTo(500);
        });

        it('should be called with the correct recipeId on both repository methods', async () => {
            mockRecipesRepository.getRecipeIngredientsWithNutrition.mockResolvedValue([]);
            mockRecipesRepository.getRecipeServings.mockResolvedValue(4);

            await service.calculateRecipeNutrition(42);

            expect(mockRecipesRepository.getRecipeIngredientsWithNutrition).toHaveBeenCalledWith(42);
            expect(mockRecipesRepository.getRecipeServings).toHaveBeenCalledWith(42);
        });

        it('should populate the CalculationResult shape correctly', async () => {
            mockRecipesRepository.getRecipeIngredientsWithNutrition.mockResolvedValue([
                makeIngredient(1, '100', 'g', { calories: 100 }),
            ]);
            mockRecipesRepository.getRecipeServings.mockResolvedValue(2);

            const result: CalculationResult = await service.calculateRecipeNutrition(1);

            expect(result).toHaveProperty('perServing');
            expect(result).toHaveProperty('total');
            expect(result).toHaveProperty('servings', 2);
            expect(result).toHaveProperty('ingredientsProcessed', 1);
            expect(result).toHaveProperty('ingredientsSkipped');
            expect(Array.isArray(result.ingredientsSkipped)).toBe(true);
        });
    });
});
