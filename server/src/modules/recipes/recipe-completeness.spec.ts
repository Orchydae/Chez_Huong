import {
    RecipeCompletenessShape,
    findRecipeCompletenessErrors,
} from './recipe-completeness';

/** A minimal recipe that satisfies the whole contract. Tests clone + break it. */
function completeRecipe(): RecipeCompletenessShape {
    return {
        cuisine: 'Vietnamese',
        ingredientSections: [
            {
                name: 'For the broth',
                ingredients: [
                    { ingredientId: 1, unit: 'g' },
                    { recipeRefId: 2, unit: 'servings' },
                    { displayName: 'fish sauce', unit: 'ml' },
                ],
            },
        ],
        stepSections: [
            { title: 'Prep', steps: [{ description: 'Chop everything.' }] },
        ],
    };
}

/** Paths flagged for a given recipe — order-independent membership assertions. */
function paths(recipe: RecipeCompletenessShape): string[] {
    return findRecipeCompletenessErrors(recipe).map(e => e.path);
}

describe('findRecipeCompletenessErrors', () => {
    it('returns no errors for a complete recipe', () => {
        expect(findRecipeCompletenessErrors(completeRecipe())).toEqual([]);
    });

    it('flags a blank cuisine', () => {
        const recipe = completeRecipe();
        recipe.cuisine = '  ';
        expect(paths(recipe)).toContain('cuisine');
    });

    it('flags a missing ingredient section', () => {
        const recipe = completeRecipe();
        recipe.ingredientSections = [];
        expect(paths(recipe)).toContain('ingredientSections');
    });

    it('flags a missing step section', () => {
        const recipe = completeRecipe();
        recipe.stepSections = [];
        expect(paths(recipe)).toContain('stepSections');
    });

    it('flags a blank / whitespace-only section name', () => {
        const recipe = completeRecipe();
        recipe.ingredientSections[0].name = '   ';
        expect(paths(recipe)).toContain('ingredientSections.0.name');
    });

    it('flags a section with no ingredients', () => {
        const recipe = completeRecipe();
        recipe.ingredientSections[0].ingredients = [];
        expect(paths(recipe)).toContain('ingredientSections.0.ingredients');
    });

    it('flags an ingredient with no source and no name', () => {
        const recipe = completeRecipe();
        recipe.ingredientSections[0].ingredients = [{ unit: 'g' }];
        expect(paths(recipe)).toContain('ingredientSections.0.ingredients.0');
    });

    it('accepts a free-text ingredient carried only by displayName', () => {
        const recipe = completeRecipe();
        recipe.ingredientSections[0].ingredients = [{ displayName: 'salt', unit: 'pinch' }];
        expect(findRecipeCompletenessErrors(recipe)).toEqual([]);
    });

    it('flags an ingredient with a blank unit', () => {
        const recipe = completeRecipe();
        recipe.ingredientSections[0].ingredients = [{ ingredientId: 1, unit: '' }];
        expect(paths(recipe)).toContain('ingredientSections.0.ingredients.0');
    });

    it('treats null ids the same as missing (Prisma-row shape)', () => {
        const recipe = completeRecipe();
        recipe.ingredientSections[0].ingredients = [
            { ingredientId: null, recipeRefId: null, displayName: null, unit: 'g' },
        ];
        expect(paths(recipe)).toContain('ingredientSections.0.ingredients.0');
    });

    it('flags a blank step section title', () => {
        const recipe = completeRecipe();
        recipe.stepSections[0].title = '';
        expect(paths(recipe)).toContain('stepSections.0.title');
    });

    it('flags a step section with no steps', () => {
        const recipe = completeRecipe();
        recipe.stepSections[0].steps = [];
        expect(paths(recipe)).toContain('stepSections.0.steps');
    });

    it('flags a step with a blank description', () => {
        const recipe = completeRecipe();
        recipe.stepSections[0].steps = [{ description: '  ' }];
        expect(paths(recipe)).toContain('stepSections.0.steps.0');
    });

    it('reports every offending row at once (not fail-fast)', () => {
        const recipe: RecipeCompletenessShape = {
            cuisine: '',
            ingredientSections: [
                { name: '', ingredients: [{ unit: '' }] },
            ],
            stepSections: [
                { title: '', steps: [{ description: '' }] },
            ],
        };
        expect(paths(recipe)).toEqual(
            expect.arrayContaining([
                'cuisine',
                'ingredientSections.0.name',
                'ingredientSections.0.ingredients.0',
                'stepSections.0.title',
                'stepSections.0.steps.0',
            ]),
        );
    });
});
