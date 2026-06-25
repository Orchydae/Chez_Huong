/*
 * Ingredient catalogue (authoring only — the whole server controller is
 * writer/admin, so these calls 403 for readers; the editor pages are already
 * gated behind RequireRole).
 */
import { api } from './client';
import type { Ingredient, IngredientSearchResult, IngredientTranslation } from './types';

/**
 * Combined search: local catalogue + USDA + published recipes (usable AS an
 * ingredient), in parallel. `excludeRecipeId` drops the recipe being edited so
 * it can't list itself as one of its own ingredients.
 */
export function searchIngredients(
  query: string,
  excludeRecipeId?: number,
): Promise<IngredientSearchResult> {
  return api.get<IngredientSearchResult>('/ingredients/search', {
    q: query,
    excludeRecipeId,
  });
}

/** Promote a USDA match into a real Ingredient row (id usable in recipes). */
export async function confirmIngredient(fdcId: number, name: string): Promise<Ingredient> {
  const { ingredient } = await api.post<{ ingredient: Ingredient }>('/ingredients/confirm', {
    fdcId,
    name,
  });
  return ingredient;
}

// ─── Ingredient name translations (writer/admin) ─────────────────────────

export function getIngredientTranslations(ingredientId: number): Promise<IngredientTranslation[]> {
  return api.get<IngredientTranslation[]>(`/ingredients/${ingredientId}/translations`);
}

/** Create or replace the ingredient's name in one locale (fr / vi). */
export function upsertIngredientTranslation(
  ingredientId: number,
  locale: string,
  name: string,
): Promise<IngredientTranslation> {
  return api.put<IngredientTranslation>(
    `/ingredients/${ingredientId}/translations/${locale}`,
    { name },
  );
}

export function deleteIngredientTranslation(
  ingredientId: number,
  locale: string,
): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/ingredients/${ingredientId}/translations/${locale}`);
}

// ─── Portion weights (how much one count-based unit weighs) ──────────────

/**
 * Record how much one of a count-based unit weighs (e.g. "1 piece = 120 g") so
 * units like "pcs" contribute to recipe nutrition. The server normalizes the
 * unit to a canonical portion name and upserts on (ingredient, unit).
 */
export function upsertIngredientPortion(
  ingredientId: number,
  unit: string,
  gramWeight: number,
): Promise<{ id: number; ingredientId: number; portionName: string; gramWeight: number }> {
  return api.put(`/ingredients/${ingredientId}/portions`, { unit, gramWeight });
}
