import { describe, it, expect } from 'vitest';
import { foldUnit, unitNeedsWeight } from './units';

describe('foldUnit', () => {
  it('lowercases', () => {
    expect(foldUnit('Cups')).toBe('cups');
    expect(foldUnit('TASSE')).toBe('tasse');
  });

  it('strips French accents', () => {
    expect(foldUnit('cuillère à thé')).toBe('cuillere a the');
    expect(foldUnit('pincée')).toBe('pincee');
    expect(foldUnit('Ç')).toBe('c');
  });

  it('drops periods', () => {
    expect(foldUnit('c.à.t.')).toBe('cat');
  });

  it('collapses runs of whitespace and trims the ends', () => {
    expect(foldUnit('  c.   à    soupe ')).toBe('c a soupe');
  });

  it('folds the several spellings of a spoon unit to the same key', () => {
    const forms = ['c. à thé', 'C. À THÉ', 'c à the', ' c.  à  thé '];
    const folded = forms.map(foldUnit);
    expect(new Set(folded).size).toBe(1);
    expect(folded[0]).toBe('c a the');
  });
});

describe('unitNeedsWeight', () => {
  it('is false for units the converter already knows (weights/volumes)', () => {
    expect(unitNeedsWeight('g')).toBe(false);
    expect(unitNeedsWeight('cup')).toBe(false);
    expect(unitNeedsWeight('tbsp')).toBe(false);
  });

  it('is false for the French/accented spellings of known units', () => {
    expect(unitNeedsWeight('Tasse')).toBe(false);
    expect(unitNeedsWeight('c. à thé')).toBe(false);
    expect(unitNeedsWeight('cuillère à soupe')).toBe(false);
  });

  it('is true for count-based units with no universal weight', () => {
    expect(unitNeedsWeight('pcs')).toBe(true);
    expect(unitNeedsWeight('slice')).toBe(true);
    expect(unitNeedsWeight('gousse')).toBe(true);
  });

  it('is false for an empty or whitespace-only unit (nothing to weigh)', () => {
    expect(unitNeedsWeight('')).toBe(false);
    expect(unitNeedsWeight('   ')).toBe(false);
  });
});
