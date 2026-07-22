import { describe, it, expect } from 'vitest';
import { localizedName } from './localizedName';
import type { Ingredient, IngredientTranslation } from '../api/types';

const tr = (locale: string, name: string): IngredientTranslation => ({
  id: 1,
  ingredientId: 1,
  locale,
  name,
});

type NameArg = Pick<Ingredient, 'name' | 'translations'>;

describe('localizedName', () => {
  it('returns the translation for a matching locale', () => {
    const ingredient: NameArg = { name: 'Cucumber', translations: [tr('fr', 'concombre')] };
    expect(localizedName(ingredient, 'fr')).toBe('concombre');
  });

  it('falls back to the canonical name when the locale has no translation', () => {
    const ingredient: NameArg = { name: 'Cucumber', translations: [tr('fr', 'concombre')] };
    // en is never stored — it is the canonical name
    expect(localizedName(ingredient, 'en')).toBe('Cucumber');
    expect(localizedName(ingredient, 'vi')).toBe('Cucumber');
  });

  it('falls back to the canonical name when translations are absent', () => {
    expect(localizedName({ name: 'Star anise', translations: undefined }, 'fr')).toBe('Star anise');
    expect(localizedName({ name: 'Star anise' }, 'fr')).toBe('Star anise');
  });

  it('picks the right translation among several locales', () => {
    const ingredient: NameArg = {
      name: 'Rice noodle',
      translations: [tr('fr', 'nouille de riz'), tr('vi', 'bánh phở')],
    };
    expect(localizedName(ingredient, 'vi')).toBe('bánh phở');
    expect(localizedName(ingredient, 'fr')).toBe('nouille de riz');
  });
});
