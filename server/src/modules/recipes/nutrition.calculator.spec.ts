import {
    NutritionSectionInput,
    PortionMap,
    addNutrition,
    computeRecipeNutrition,
    convertToGrams,
    createEmptyNutrition,
    divideByServings,
    normalizeUnit,
    parseQuantity,
    portionKey,
    scaleNutrition,
} from './nutrition.calculator';

describe('parseQuantity', () => {
    it('parses a plain integer', () => {
        expect(parseQuantity('2')).toBe(2);
    });

    it('parses a decimal', () => {
        expect(parseQuantity('1.5')).toBe(1.5);
    });

    it('parses a simple fraction', () => {
        expect(parseQuantity('1/2')).toBe(0.5);
    });

    it('parses a mixed number', () => {
        expect(parseQuantity('1 1/2')).toBe(1.5);
    });

    it('averages a range', () => {
        expect(parseQuantity('1-2')).toBe(1.5);
    });

    it('trims surrounding whitespace', () => {
        expect(parseQuantity('  3  ')).toBe(3);
    });

    it('returns 0 for non-numeric input', () => {
        expect(parseQuantity('abc')).toBe(0);
        expect(parseQuantity('')).toBe(0);
    });
});

describe('normalizeUnit', () => {
    it('lowercases and trims', () => {
        expect(normalizeUnit('  G  ')).toBe('g');
    });

    it('resolves plural aliases to the canonical unit', () => {
        expect(normalizeUnit('cups')).toBe('cup');
        expect(normalizeUnit('tablespoons')).toBe('tbsp');
        expect(normalizeUnit('Pounds')).toBe('lb');
    });

    it('passes through an unknown unit unchanged (but normalized)', () => {
        expect(normalizeUnit('Clove')).toBe('clove');
    });

    it('folds count-based spellings onto canonical "piece"/"unit"', () => {
        expect(normalizeUnit('Pcs')).toBe('piece');
        expect(normalizeUnit('pc')).toBe('piece');
        expect(normalizeUnit('pieces')).toBe('piece');
        expect(normalizeUnit('morceaux')).toBe('piece');
        expect(normalizeUnit('Units')).toBe('unit');
    });

    it('folds French unit names and abbreviations onto canonical units', () => {
        expect(normalizeUnit('Tasse')).toBe('cup');
        expect(normalizeUnit('cuillère à soupe')).toBe('tbsp');
        expect(normalizeUnit('c. à soupe')).toBe('tbsp');
        expect(normalizeUnit('càs')).toBe('tbsp');
        expect(normalizeUnit('cuillère à thé')).toBe('tsp');
        expect(normalizeUnit('c. à thé')).toBe('tsp');
        expect(normalizeUnit('c à thé')).toBe('tsp'); // accents/periods optional
        expect(normalizeUnit('litre')).toBe('l');
        expect(normalizeUnit('Grammes')).toBe('g');
        expect(normalizeUnit('kilo')).toBe('kg');
    });
});

describe('convertToGrams', () => {
    const noPortions: PortionMap = new Map();

    it('converts weight units directly', () => {
        expect(convertToGrams(1, '2', 'kg', noPortions)).toBe(2000);
        expect(convertToGrams(1, '100', 'g', noPortions)).toBe(100);
    });

    it('treats negligible units as zero', () => {
        expect(convertToGrams(1, '1', 'pinch', noPortions)).toBe(0);
        expect(convertToGrams(1, '2', 'to taste', noPortions)).toBe(0);
    });

    it('returns 0 for a non-positive quantity', () => {
        expect(convertToGrams(1, '0', 'g', noPortions)).toBe(0);
    });

    it('uses a pre-loaded portion when present', () => {
        const portions: PortionMap = new Map([[portionKey(5, 'slice'), 30]]);
        expect(convertToGrams(5, '2', 'slice', noPortions)).toBe(0); // no portion → unconvertible
        expect(convertToGrams(5, '2', 'slice', portions)).toBe(60); // 2 × 30g
    });

    it('prefers a portion over the volume fallback', () => {
        const portions: PortionMap = new Map([[portionKey(5, 'cup'), 125]]);
        expect(convertToGrams(5, '1', 'cup', portions)).toBe(125); // not the 240ml fallback
    });

    it('falls back to volume (1g≈1ml) when no portion exists', () => {
        expect(convertToGrams(9, '1', 'cup', noPortions)).toBe(240);
        expect(convertToGrams(9, '2', 'tbsp', noPortions)).toBe(30);
    });

    it('returns 0 for an unconvertible count unit', () => {
        expect(convertToGrams(9, '2', 'clove', noPortions)).toBe(0);
    });

    it('converts a "pcs" unit via a portion stored under canonical "piece"', () => {
        const portions: PortionMap = new Map([[portionKey(5, 'piece'), 120]]);
        // author typed "Pcs"; the stored portion is keyed "piece" → they line up
        expect(convertToGrams(5, '2', 'Pcs', portions)).toBe(240); // 2 × 120g
        expect(convertToGrams(5, '2', 'Pcs', noPortions)).toBe(0); // still skipped without a weight
    });

    it('converts French volume and weight units', () => {
        expect(convertToGrams(1, '2', 'tasse', noPortions)).toBe(480); // 2 × 240ml ≈ 480g
        expect(convertToGrams(1, '1', 'c. à soupe', noPortions)).toBe(15);
        expect(convertToGrams(1, '20', 'cl', noPortions)).toBe(200); // 20 × 10ml
        expect(convertToGrams(1, '500', 'grammes', noPortions)).toBe(500);
        expect(convertToGrams(1, '1', 'kilo', noPortions)).toBe(1000);
    });

    it('treats French negligible units as zero', () => {
        expect(convertToGrams(1, '1', 'pincée', noPortions)).toBe(0);
        expect(convertToGrams(1, '3', 'gouttes', noPortions)).toBe(0);
        expect(convertToGrams(1, '1', 'au goût', noPortions)).toBe(0);
    });
});

describe('scaleNutrition / addNutrition / divideByServings', () => {
    it('scales every nutrient by the factor', () => {
        const scaled = scaleNutrition({ calories: 100, protein: 10 }, 2);
        expect(scaled.calories).toBe(200);
        expect(scaled.protein).toBe(20);
    });

    it('treats null nutrients as zero when scaling', () => {
        const scaled = scaleNutrition({ calories: null, protein: 5 }, 3);
        expect(scaled.calories).toBe(0);
        expect(scaled.protein).toBe(15);
    });

    it('sums two nutrition objects key by key', () => {
        const sum = addNutrition(createEmptyNutrition(), { calories: 50, sodium: 10 });
        expect(sum.calories).toBe(50);
        expect(sum.sodium).toBe(10);
        expect(sum.protein).toBe(0);
    });

    it('divides totals by servings', () => {
        const per = divideByServings({ ...createEmptyNutrition(), calories: 400 }, 4);
        expect(per.calories).toBe(100);
    });

    it('guards against division by zero servings', () => {
        const per = divideByServings({ ...createEmptyNutrition(), calories: 400 }, 0);
        expect(per.calories).toBe(400); // treated as 1 serving
    });
});

describe('computeRecipeNutrition', () => {
    const sections = (
        ings: NutritionSectionInput['ingredients'],
    ): NutritionSectionInput[] => [{ ingredients: ings }];

    it('scales per-100g nutrition by grams and divides by servings', () => {
        const result = computeRecipeNutrition(
            sections([
                { ingredientId: 1, quantity: '200', unit: 'g', ingredient: { nutrition: { calories: 200, protein: 10 } } },
            ]),
            new Map(),
            2,
        );
        // 200g → factor 2 → 400 kcal total; 2 servings → 200 kcal/serving
        expect(result.total.calories).toBe(400);
        expect(result.total.protein).toBe(20);
        expect(result.perServing.calories).toBe(200);
        expect(result.servings).toBe(2);
        expect(result.ingredientsProcessed).toBe(1);
        expect(result.ingredientsSkipped).toHaveLength(0);
    });

    it('sums across multiple sections and ingredients', () => {
        const result = computeRecipeNutrition(
            [
                { ingredients: [{ ingredientId: 1, quantity: '100', unit: 'g', ingredient: { nutrition: { calories: 100 } } }] },
                { ingredients: [{ ingredientId: 2, quantity: '50', unit: 'g', ingredient: { nutrition: { calories: 200 } } }] },
            ],
            new Map(),
            1,
        );
        // 100g×(100/100) + 50g×(200/100) = 100 + 100 = 200
        expect(result.total.calories).toBe(200);
        expect(result.ingredientsProcessed).toBe(2);
    });

    it('skips ingredients with no nutrition data', () => {
        const result = computeRecipeNutrition(
            sections([
                { ingredientId: 7, quantity: '100', unit: 'g', ingredient: { nutrition: null } },
            ]),
            new Map(),
            1,
        );
        expect(result.ingredientsProcessed).toBe(0);
        expect(result.ingredientsSkipped).toEqual(['ID 7: No nutrition data']);
        expect(result.total.calories).toBe(0);
    });

    it('skips ingredients whose unit cannot be converted', () => {
        const result = computeRecipeNutrition(
            sections([
                { ingredientId: 8, quantity: '2', unit: 'clove', ingredient: { nutrition: { calories: 100 } } },
            ]),
            new Map(),
            1,
        );
        expect(result.ingredientsProcessed).toBe(0);
        expect(result.ingredientsSkipped).toEqual(['ID 8: Could not convert 2 clove']);
    });

    it('uses the supplied portion map to convert non-weight units', () => {
        const result = computeRecipeNutrition(
            sections([
                { ingredientId: 3, quantity: '1', unit: 'cup', ingredient: { nutrition: { calories: 364 } } },
            ]),
            new Map([[portionKey(3, 'cup'), 125]]), // 1 cup flour = 125g
            1,
        );
        // 125g × (364/100) = 455
        expect(result.total.calories).toBe(455);
        expect(result.ingredientsProcessed).toBe(1);
    });
});
