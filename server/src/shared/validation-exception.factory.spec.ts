import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateRecipeDto } from '../modules/recipes/dtos/create-recipe.dto';
import { validationExceptionFactory } from './validation-exception.factory';

/**
 * Pins the dotted field-path format the client relies on to highlight the exact
 * failing row. If class-validator's nesting ever changes shape, this breaks
 * loudly here instead of silently degrading the form to a generic error.
 */
describe('validationExceptionFactory', () => {
    function fieldsFor(plain: unknown): string[] {
        const dto = plainToInstance(CreateRecipeDto, plain);
        const errors = validateSync(dto as object, {
            whitelist: true,
            forbidNonWhitelisted: true,
        });
        const exception = validationExceptionFactory(errors);
        const body = exception.getResponse() as { fields: string[] };
        return body.fields;
    }

    const validRecipe = () => ({
        title: 'Phở bò',
        locale: 'vi',
        prepTime: 10,
        cookTime: 20,
        difficulty: 'EASY',
        type: 'MAIN',
        cuisine: 'Viêt Nam',
        servings: 4,
        ingredientSections: [
            { name: 'Bouillon', ingredients: [{ ingredientId: 1, quantity: '1', unit: 'kg' }] },
        ],
        stepSections: [{ title: 'Préparation', steps: [{ order: 1, description: 'Cuire' }] }],
    });

    it('reports the exact ingredient-row field path for an empty unit', () => {
        const recipe = validRecipe();
        recipe.ingredientSections[0].ingredients[0].unit = '';
        expect(fieldsFor(recipe)).toContain('ingredientSections.0.ingredients.0.unit');
    });

    it('reports nested indices for a deeper section/row', () => {
        const recipe = validRecipe();
        recipe.ingredientSections.push({
            name: 'Garniture',
            ingredients: [
                { ingredientId: 1, quantity: '1', unit: 'kg' },
                { ingredientId: 2, quantity: '1', unit: '' }, // section 1, row 1
            ],
        });
        expect(fieldsFor(recipe)).toContain('ingredientSections.1.ingredients.1.unit');
    });

    it('reports a missing top-level field and a step path', () => {
        const recipe = validRecipe();
        recipe.title = '';
        recipe.stepSections[0].steps[0].description = '';
        const fields = fieldsFor(recipe);
        expect(fields).toContain('title');
        expect(fields).toContain('stepSections.0.steps.0.description');
    });

    it('returns no fields for a valid recipe', () => {
        expect(fieldsFor(validRecipe())).toEqual([]);
    });
});
