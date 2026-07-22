/*
 * Whether a typed unit needs an explicit "grams per unit" weight to count
 * toward nutrition. The server's calculator converts weights (g, oz…) and
 * volumes (cup, tbsp…) — including their French names (tasse, cuillère à
 * soupe…) — on its own; anything else (pieces, slices, cloves…) has no
 * universal weight and only converts via a per-ingredient portion.
 *
 * This list mirrors the server converter ONLY to decide whether to OFFER the
 * optional weight field — it is a UI hint, never validation. The server stays
 * the single source of truth for what actually converts. If it drifts, the
 * worst case is offering (or hiding) an optional field; no save is blocked.
 */

/**
 * Fold a unit for loose matching: lowercase, strip French accents, drop periods,
 * collapse whitespace — so "Tasse", "c. à thé" and "càt" all line up with the
 * keys below. Mirrors the FOLD step of the server's `normalizeUnit` only — it
 * does NOT resolve the server's unit aliases (the client never needs that).
 *
 * This is the single client-side copy of that fold, exported so the unit picker
 * (UnitAutocomplete) filters by exactly the same rule. UI hint / display
 * filtering only — the server stays the single source of truth for what
 * actually converts; if this drifts from the server, the worst case is offering
 * (or hiding) an optional field or a suggestion, never a blocked save.
 */
export function foldUnit(unit: string): string {
  return unit
    .toLowerCase()
    .replace(/[àâä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[îïì]/g, 'i')
    .replace(/[ôö]/g, 'o').replace(/[ûüù]/g, 'u').replace(/ç/g, 'c')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// units the converter already knows (normalized, incl. the aliases it folds)
const SELF_CONVERTING_UNITS = new Set([
  // weights
  'g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms', 'oz', 'onz', 'ounce', 'ounces',
  'lb', 'lbs', 'pound', 'pounds',
  // volumes
  'cup', 'cups', 'tbsp', 'tablespoon', 'tablespoons', 'tsp', 'teaspoon', 'teaspoons',
  'ml', 'cl', 'dl', 'milliliter', 'milliliters', 'l', 'liter', 'liters', 'floz', 'fl oz',
  // negligible amounts the converter treats as ~0
  'pinch', 'dash', 'smidgen', 'drop', 'to taste', 'as needed',
  // ── French ──────────────────────────────────────────────────────────
  // volumes
  'tasse', 'tasses',
  'cuillere a soupe', 'cuiller a soupe', 'c a soupe', 'c a s', 'cas',
  'cuillere a the', 'cuiller a the', 'c a the', 'c a t', 'cat',
  'cuillere a cafe', 'c a cafe', 'c a c',
  'litre', 'litres', 'millilitre', 'millilitres',
  'centilitre', 'centilitres', 'decilitre', 'decilitres',
  // weights
  'gramme', 'grammes', 'kilogramme', 'kilogrammes', 'kilo', 'kilos',
  'once', 'onces', 'livre', 'livres',
  // negligible
  'pincee', 'pincees', 'goutte', 'gouttes', 'au gout', 'a volonte',
]);

/** True when this unit (e.g. "pcs", "slice") would otherwise be skipped in nutrition. */
export function unitNeedsWeight(unit: string): boolean {
  const u = foldUnit(unit);
  return u.length > 0 && !SELF_CONVERTING_UNITS.has(u);
}

/**
 * The measurement units offered (most-common-first) in the authoring form's
 * unit picker, grouped loosely: volume, then weight, then count, then
 * negligible. Each is an i18n key under `unitOption`; the localized label is
 * BOTH shown in the dropdown AND written verbatim into the recipe (units stay
 * free text), so every label must be one the server's converter recognizes —
 * keep this list and the converter's known units (above) in step.
 */
export const UNIT_OPTION_KEYS = [
  'tsp', 'tbsp', 'cup', 'ml', 'cl', 'dl', 'l',
  'g', 'kg', 'oz', 'lb',
  'piece',
  'pinch', 'toTaste',
] as const;
