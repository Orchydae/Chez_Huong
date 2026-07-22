import { describe, it, expect } from 'vitest';
import {
  approvedTranslationMap,
  recipeTranslatableFields,
  translationCoverage,
  type TranslatableField,
} from './recipeFieldPaths';
import type {
  IngredientSection,
  Recipe,
  Step,
  StepSection,
  Translation,
  TranslationStatus,
} from '../api/types';

// ── fixtures ──────────────────────────────────────────────────────────────
function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 1,
    title: 'Phở',
    description: null,
    locale: 'fr',
    prepTime: 20,
    prepTimeUnit: 'MINUTES',
    cookTime: 90,
    cookTimeUnit: 'MINUTES',
    difficulty: 'MEDIUM',
    type: 'MAIN',
    cuisine: 'Viêt Nam',
    servings: 4,
    imageUrl: null,
    slug: 'pho',
    yield: null,
    status: 'PUBLISHED',
    publishedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorId: 'author-1',
    ingredientSections: [],
    stepSections: [],
    particularities: [],
    _count: { likes: 0 },
    ...overrides,
  };
}

const step = (order: number, description: string): Step => ({
  id: order,
  order,
  description,
  mediaUrl: null,
  stepSectionId: 1,
});
const stepSection = (title: string, steps: Step[]): StepSection => ({
  id: 1,
  title,
  recipeId: 1,
  steps,
});
const ingredientSection = (name: string): IngredientSection => ({
  id: 1,
  name,
  recipeId: 1,
  ingredients: [],
});
const translation = (
  field: string,
  value: string,
  status: TranslationStatus,
): Translation => ({
  id: 1,
  recipeId: 1,
  field,
  locale: 'en',
  value,
  translatorId: 'u',
  status,
  createdAt: '',
  updatedAt: '',
});

const paths = (fields: TranslatableField[]) => fields.map(f => f.path);

// ── recipeTranslatableFields ────────────────────────────────────────────────
describe('recipeTranslatableFields', () => {
  it('always emits title then cuisine, skipping absent description/yield', () => {
    expect(paths(recipeTranslatableFields(makeRecipe()))).toEqual(['title', 'cuisine']);
  });

  it('includes description and yield only when present', () => {
    const fields = recipeTranslatableFields(
      makeRecipe({ description: 'Un bouillon parfumé', yield: '4 bols' }),
    );
    expect(paths(fields)).toEqual(['title', 'description', 'yield', 'cuisine']);
    expect(fields.find(f => f.path === 'yield')?.value).toBe('4 bols');
  });

  it('numbers sections 1-indexed and sorts steps by `order`, not array position', () => {
    const recipe = makeRecipe({
      ingredientSections: [ingredientSection('Bouillon')],
      // steps deliberately out of order: order 2 before order 1
      stepSections: [stepSection('Préparation', [step(2, 'B'), step(1, 'A')])],
    });
    const fields = recipeTranslatableFields(recipe);
    expect(paths(fields)).toEqual([
      'title',
      'cuisine',
      'ingredientSection.1.name',
      'stepSection.1.title',
      'stepSection.1.step.1.description',
      'stepSection.1.step.2.description',
    ]);
    // sorted: step.1 is the order:1 row ("A"), step.2 the order:2 row ("B")
    expect(fields.find(f => f.path === 'stepSection.1.step.1.description')?.value).toBe('A');
    expect(fields.find(f => f.path === 'stepSection.1.step.2.description')?.value).toBe('B');
  });

  it('skips empty section names/titles but still emits their steps', () => {
    const recipe = makeRecipe({
      ingredientSections: [ingredientSection('')],
      stepSections: [stepSection('', [step(1, 'X')])],
    });
    const p = paths(recipeTranslatableFields(recipe));
    expect(p).not.toContain('ingredientSection.1.name');
    expect(p).not.toContain('stepSection.1.title');
    expect(p).toContain('stepSection.1.step.1.description');
  });
});

// ── approvedTranslationMap ──────────────────────────────────────────────────
describe('approvedTranslationMap', () => {
  it('returns an empty map for undefined', () => {
    expect(approvedTranslationMap(undefined).size).toBe(0);
  });

  it('keeps APPROVED rows and drops DRAFT rows', () => {
    const map = approvedTranslationMap([
      translation('title', 'Beef noodle soup', 'APPROVED'),
      translation('description', 'draft text', 'DRAFT'),
    ]);
    expect(map.get('title')).toBe('Beef noodle soup');
    expect(map.has('description')).toBe(false);
  });
});

// ── translationCoverage ─────────────────────────────────────────────────────
describe('translationCoverage', () => {
  const fields: TranslatableField[] = [
    { path: 'title', value: 'a' },
    { path: 'cuisine', value: 'b' },
    { path: 'description', value: 'c' },
    { path: 'yield', value: 'd' },
  ];

  it('is 1 when there are no translatable fields', () => {
    expect(translationCoverage([], new Map())).toBe(1);
  });

  it('is the fraction of fields that have an approved translation', () => {
    const translated = new Map([
      ['title', 'x'],
      ['cuisine', 'y'],
    ]);
    expect(translationCoverage(fields, translated)).toBe(0.5);
  });

  it('is 0 when nothing is translated and 1 when everything is', () => {
    expect(translationCoverage(fields, new Map())).toBe(0);
    const all = new Map(fields.map(f => [f.path, 'x']));
    expect(translationCoverage(fields, all)).toBe(1);
  });
});
