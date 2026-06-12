import type { Ingredient } from '../api/types';

/**
 * The ingredient's name in the requested language. The canonical `name` is the
 * English USDA name; `translations` hold curated French/Vietnamese names. Any
 * locale without a translation falls back to the canonical name — so `en`
 * (never stored) and untranslated ingredients both resolve to `name`.
 */
export function localizedName(
  ingredient: Pick<Ingredient, 'name' | 'translations'>,
  lang: string,
): string {
  return ingredient.translations?.find(tr => tr.locale === lang)?.name ?? ingredient.name;
}
