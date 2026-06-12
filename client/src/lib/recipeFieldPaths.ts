/*
 * Canonical translatable field paths for a recipe (M4). The dotted-path
 * convention matches the server's Translation.field (see CONTEXT.md
 * "Field path"): numeric segments are 1-indexed. This single enumerator is the
 * source of truth for BOTH the reader (coverage badge + per-field fallback) and
 * the writer authoring UI — keeping the two ends in lockstep.
 *
 * Note: ingredient NAMES are NOT recipe fields — they're shared catalogue
 * entries translated via IngredientTranslation, so they're absent here.
 */
import type { Recipe, Translation } from '../api/types';

export interface TranslatableField {
  /** Dotted path identifying the field, e.g. "stepSection.1.step.2.description". */
  path: string;
  /** Base-locale text — the fallback shown when no translation exists. */
  value: string;
}

/** Every translatable field on the recipe, in display order. */
export function recipeTranslatableFields(recipe: Recipe): TranslatableField[] {
  const fields: TranslatableField[] = [{ path: 'title', value: recipe.title }];

  if (recipe.description) fields.push({ path: 'description', value: recipe.description });
  if (recipe.yield) fields.push({ path: 'yield', value: recipe.yield });
  fields.push({ path: 'cuisine', value: recipe.cuisine });

  recipe.ingredientSections.forEach((section, si) => {
    if (section.name) {
      fields.push({ path: `ingredientSection.${si + 1}.name`, value: section.name });
    }
  });

  recipe.stepSections.forEach((section, si) => {
    if (section.title) {
      fields.push({ path: `stepSection.${si + 1}.title`, value: section.title });
    }
    [...section.steps]
      .sort((a, b) => a.order - b.order)
      .forEach((step, sj) => {
        fields.push({
          path: `stepSection.${si + 1}.step.${sj + 1}.description`,
          value: step.description,
        });
      });
  });

  return fields;
}

/** field path → APPROVED translated value, for the active locale. */
export function approvedTranslationMap(translations: Translation[] | undefined): Map<string, string> {
  const map = new Map<string, string>();
  for (const tr of translations ?? []) {
    if (tr.status === 'APPROVED') map.set(tr.field, tr.value);
  }
  return map;
}

/** Share of translatable fields that have an approved translation (0–1). */
export function translationCoverage(
  fields: TranslatableField[],
  translated: Map<string, string>,
): number {
  if (fields.length === 0) return 1;
  const done = fields.filter(f => translated.has(f.path)).length;
  return done / fields.length;
}
