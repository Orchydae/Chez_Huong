/*
 * Content-language switch (M4). Distinct from the i18n UI-chrome language
 * (which ships French-only): this is the language a READER wants recipe
 * CONTENT in. It drives recipe-field display + fallback, ingredient-name
 * localization, the translation-coverage badge, and cross-language Discovery
 * search. Persisted to localStorage so a reader's choice survives reloads.
 *
 * Uses createElement (not JSX) so this stays a .ts module exporting both the
 * provider and its hook/constants — same pattern as api/auth.api.ts.
 */
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/** Languages a reader can switch recipe content into. `fr` is the base. */
export const CONTENT_LANGUAGES = ['fr', 'en', 'vi'] as const;
export type ContentLanguage = (typeof CONTENT_LANGUAGES)[number];

/** The language recipes are authored in — fields with no translation fall back to it. */
export const BASE_LOCALE: ContentLanguage = 'fr';

const STORAGE_KEY = 'content_lang';

interface LanguageContextValue {
  lang: ContentLanguage;
  setLang: (lang: ContentLanguage) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStored(): ContentLanguage {
  const stored = localStorage.getItem(STORAGE_KEY);
  return CONTENT_LANGUAGES.includes(stored as ContentLanguage)
    ? (stored as ContentLanguage)
    : BASE_LOCALE;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<ContentLanguage>(readStored);

  const setLang = useCallback((next: ContentLanguage) => {
    setLangState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return createElement(LanguageContext.Provider, { value }, children);
}

export function useContentLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useContentLanguage must be used within <LanguageProvider>');
  return ctx;
}
