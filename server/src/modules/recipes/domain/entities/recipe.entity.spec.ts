import {
    Recipe,
    RecipeIngredient,
    IngredientSection,
    Step,
    StepSection,
    ParticularityType,
    TimeUnit,
    EmptyIngredientSectionsError,
    EmptyIngredientsError,
    EmptyStepSectionsError,
    EmptyStepsError,
} from './recipe.entity';

describe('Recipe Entity', () => {
    // ========================================================================
    // VALUE OBJECTS - RecipeIngredient
    // ========================================================================
    describe('RecipeIngredient', () => {
        it('should create a RecipeIngredient with all properties', () => {
            const ingredient = new RecipeIngredient(1, '100', 'g');

            expect(ingredient.ingredientId).toBe(1);
            expect(ingredient.quantity).toBe('100');
            expect(ingredient.unit).toBe('g');
        });

        it('should support fractional quantities', () => {
            const ingredient = new RecipeIngredient(2, '1/2', 'cup');

            expect(ingredient.quantity).toBe('1/2');
        });
    });

    // ========================================================================
    // VALUE OBJECTS - IngredientSection
    // ========================================================================
    describe('IngredientSection', () => {
        it('should create an IngredientSection with ingredients', () => {
            const ingredients = [
                new RecipeIngredient(1, '100', 'g'),
                new RecipeIngredient(2, '2', 'tbsp'),
            ];
            const section = new IngredientSection('Main Ingredients', ingredients);

            expect(section.name).toBe('Main Ingredients');
            expect(section.ingredients).toHaveLength(2);
        });

        it('should throw EmptyIngredientsError when ingredients array is empty', () => {
            expect(() => {
                new IngredientSection('Empty Section', []);
            }).toThrow(EmptyIngredientsError);
        });

        it('should throw EmptyIngredientsError with section name in message', () => {
            expect(() => {
                new IngredientSection('My Section', []);
            }).toThrow('Ingredient section "My Section" must have at least one ingredient');
        });

        it('should create section without French name', () => {
            const section = new IngredientSection('Main', [new RecipeIngredient(1, '100', 'g')]);

            expect(section.name).toBe('Main');
        });
    });

    // ========================================================================
    // VALUE OBJECTS - Step
    // ========================================================================
    describe('Step', () => {
        it('should create a Step with all properties', () => {
            const step = new Step(1, 'Preheat oven', 'https://example.com/video.mp4');

            expect(step.order).toBe(1);
            expect(step.description).toBe('Preheat oven');
            expect(step.mediaUrl).toBe('https://example.com/video.mp4');
        });

        it('should allow optional mediaUrl', () => {
            const step = new Step(1, 'Mix ingredients');

            expect(step.mediaUrl).toBeUndefined();
        });
    });

    // ========================================================================
    // VALUE OBJECTS - StepSection
    // ========================================================================
    describe('StepSection', () => {
        it('should create a StepSection with steps', () => {
            const steps = [
                new Step(1, 'Prep vegetables'),
                new Step(2, 'Cook meat'),
            ];
            const section = new StepSection('Preparation', steps);

            expect(section.title).toBe('Preparation');
            expect(section.steps).toHaveLength(2);
        });

        it('should throw EmptyStepsError when steps array is empty', () => {
            expect(() => {
                new StepSection('Empty Section', []);
            }).toThrow(EmptyStepsError);
        });

        it('should throw EmptyStepsError with section title in message', () => {
            expect(() => {
                new StepSection('Cooking', []);
            }).toThrow('Step section "Cooking" must have at least one step');
        });
    });

    // ========================================================================
    // AGGREGATE ROOT - Recipe (Constructor)
    // ========================================================================
    describe('Recipe constructor', () => {
        const validIngredientSections = [
            new IngredientSection('Main', [new RecipeIngredient(1, '100', 'g')]),
        ];
        const validStepSections = [
            new StepSection('Prep', [new Step(1, 'Wash')]),
        ];

        it('should create a Recipe instance with required parameters', () => {
            const recipe = new Recipe(
                1,
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
                validIngredientSections,
                validStepSections,
            );

            expect(recipe).toBeInstanceOf(Recipe);
            expect(recipe.id).toBe(1);
            expect(recipe.title).toBe('Pho Bo');
            expect(recipe.locale).toBe('vi');
            expect(recipe.ingredientSections).toHaveLength(1);
            expect(recipe.stepSections).toHaveLength(1);
        });

        it('should allow null description', () => {
            const recipe = new Recipe(
                1,
                'Pho Bo',
                null,
                'vi',
                30,
                TimeUnit.MINUTES,
                60,
                TimeUnit.MINUTES,
                'EASY',
                'MAIN',
                'VIETNAMESE',
                4,
                'author-123',
                validIngredientSections,
                validStepSections,
            );

            expect(recipe.description).toBeNull();
        });
    });

    // ========================================================================
    // AGGREGATE ROOT - Recipe.create() factory
    // ========================================================================
    describe('Recipe.create', () => {
        const createValidIngredientSections = () => [
            new IngredientSection('Main', [
                new RecipeIngredient(1, '100', 'g'),
                new RecipeIngredient(2, '2', 'tbsp'),
            ]),
        ];

        const createValidStepSections = () => [
            new StepSection('Prep', [new Step(1, 'Wash')]),
        ];

        it('should create a Recipe with valid data', () => {
            const recipe = Recipe.create(
                'Pho Bo',
                'Vietnamese soup',
                'vi',
                30,
                TimeUnit.MINUTES,
                120,
                TimeUnit.MINUTES,
                'MEDIUM',
                'SOUP',
                'VIETNAMESE',
                4,
                'author-123',
                createValidIngredientSections(),
                createValidStepSections(),
            );

            expect(recipe).toBeInstanceOf(Recipe);
            expect(recipe.id).toBe(0); // New recipe
            expect(recipe.title).toBe('Pho Bo');
            expect(recipe.locale).toBe('vi');
            expect(recipe.ingredientSections).toHaveLength(1);
            expect(recipe.stepSections).toHaveLength(1);
        });

        it('should throw EmptyIngredientSectionsError when ingredientSections is empty', () => {
            expect(() => {
                Recipe.create(
                    'Recipe',
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
                    [], // Empty!
                    createValidStepSections(),
                );
            }).toThrow(EmptyIngredientSectionsError);
        });

        it('should throw EmptyIngredientSectionsError with descriptive message', () => {
            expect(() => {
                Recipe.create(
                    'Recipe',
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
                    [],
                    createValidStepSections(),
                );
            }).toThrow('Recipe must have at least one ingredient section');
        });

        it('should throw EmptyStepSectionsError when stepSections is empty array', () => {
            expect(() => {
                Recipe.create(
                    'Recipe',
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
                    [], // Empty step sections!
                );
            }).toThrow(EmptyStepSectionsError);
        });

        it('should throw EmptyStepSectionsError with descriptive message', () => {
            expect(() => {
                Recipe.create(
                    'Recipe',
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
                    [], // Empty step sections!
                );
            }).toThrow('Recipe must have at least one step section');
        });

        it('should create Recipe with particularities', () => {
            const particularities = [ParticularityType.VEGAN, ParticularityType.GLUTEN_FREE];

            const recipe = Recipe.create(
                'Recipe',
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
                particularities,
            );

            expect(recipe.particularities).toEqual(particularities);
        });

        it('should create Recipe with multiple stepSections', () => {
            const stepSections = [
                new StepSection('Prep', [new Step(1, 'Wash vegetables')]),
                new StepSection('Cook', [new Step(1, 'Boil water')]),
            ];

            const recipe = Recipe.create(
                'Recipe',
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
                stepSections,
            );

            expect(recipe.stepSections).toHaveLength(2);
        });
    });

    // ========================================================================
    // ENUMS
    // ========================================================================
    describe('TimeUnit enum', () => {
        it('should have MINUTES value', () => {
            expect(TimeUnit.MINUTES).toBe('MINUTES');
        });

        it('should have HOURS value', () => {
            expect(TimeUnit.HOURS).toBe('HOURS');
        });
    });

    describe('ParticularityType enum', () => {
        it('should have all dietary restriction values', () => {
            expect(ParticularityType.VEGETARIAN).toBe('VEGETARIAN');
            expect(ParticularityType.VEGAN).toBe('VEGAN');
            expect(ParticularityType.GLUTEN_FREE).toBe('GLUTEN_FREE');
            expect(ParticularityType.DAIRY_FREE).toBe('DAIRY_FREE');
            expect(ParticularityType.NUT_FREE).toBe('NUT_FREE');
            expect(ParticularityType.EGG_FREE).toBe('EGG_FREE');
            expect(ParticularityType.SEAFOOD_FREE).toBe('SEAFOOD_FREE');
            expect(ParticularityType.SOY_FREE).toBe('SOY_FREE');
            expect(ParticularityType.HALAL).toBe('HALAL');
            expect(ParticularityType.KOSHER).toBe('KOSHER');
            expect(ParticularityType.LOW_SODIUM).toBe('LOW_SODIUM');
            expect(ParticularityType.LOW_SUGAR).toBe('LOW_SUGAR');
            expect(ParticularityType.LOW_CARB).toBe('LOW_CARB');
            expect(ParticularityType.HIGH_PROTEIN).toBe('HIGH_PROTEIN');
        });

        it('should have correct number of particularity types', () => {
            const particularityValues = Object.values(ParticularityType);
            expect(particularityValues).toHaveLength(14);
        });
    });

    // ========================================================================
    // VALIDATION ERRORS
    // ========================================================================
    describe('Validation Errors', () => {
        describe('EmptyIngredientSectionsError', () => {
            it('should have correct name and message', () => {
                const error = new EmptyIngredientSectionsError();
                expect(error.name).toBe('EmptyIngredientSectionsError');
                expect(error.message).toBe('Recipe must have at least one ingredient section');
            });

            it('should be an instance of Error', () => {
                const error = new EmptyIngredientSectionsError();
                expect(error).toBeInstanceOf(Error);
            });
        });

        describe('EmptyIngredientsError', () => {
            it('should have correct name and message with section name', () => {
                const error = new EmptyIngredientsError('Sauce');
                expect(error.name).toBe('EmptyIngredientsError');
                expect(error.message).toBe('Ingredient section "Sauce" must have at least one ingredient');
            });
        });

        describe('EmptyStepSectionsError', () => {
            it('should have correct name and message', () => {
                const error = new EmptyStepSectionsError();
                expect(error.name).toBe('EmptyStepSectionsError');
                expect(error.message).toBe('Recipe must have at least one step section');
            });
        });

        describe('EmptyStepsError', () => {
            it('should have correct name and message with section title', () => {
                const error = new EmptyStepsError('Cooking');
                expect(error.name).toBe('EmptyStepsError');
                expect(error.message).toBe('Step section "Cooking" must have at least one step');
            });
        });
    });
});
