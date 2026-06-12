/*
 * Recipe-field translations (M4). Readers fetch approved translations to view a
 * recipe in their language; writers pre-fill via the Google proxy and save.
 * Only api/ talks to the server (see client.ts).
 */
import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { Translation, TranslateResponse } from './types';

export const translationKeys = {
  all: ['translations'] as const,
  forRecipe: (recipeId: number, locale: string) =>
    [...translationKeys.all, recipeId, locale] as const,
};

/**
 * Stored translations for one recipe in one locale. Disabled (no request) when
 * the reader is viewing the base language — there's nothing to fetch.
 */
export function useRecipeTranslations(recipeId: number, locale: string, enabled = true) {
  return useQuery({
    queryKey: translationKeys.forRecipe(recipeId, locale),
    queryFn: () => api.get<Translation[]>('/translations', { recipeId, locale }),
    enabled,
  });
}

/** Machine-translation pre-fill (writer/admin only). Never persisted on its own. */
export function translateText(
  text: string,
  targetLang: string,
  sourceLang?: string,
): Promise<TranslateResponse> {
  return api.post<TranslateResponse>('/translate', { text, targetLang, sourceLang });
}

/** Create or overwrite the translation for (recipeId, field, locale). Idempotent. */
export function upsertTranslation(input: {
  recipeId: number;
  field: string;
  locale: string;
  value: string;
}): Promise<Translation> {
  return api.post<Translation>('/translations', input);
}
