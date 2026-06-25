/*
 * The app language — a single switch that drives BOTH the UI chrome (via
 * i18next) and recipe-content display. Picking a language re-renders the whole
 * interface live (no reload) AND scopes recipe-field display + fallback,
 * ingredient-name localization, the translation-coverage badge, and
 * cross-language Discovery search. Persisted to localStorage so the choice
 * survives reloads.
 *
 * This module owns the active language; i18n.ts is the rendering engine it
 * drives. The import is one-directional (language → i18n), no cycle.
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
import i18n from './i18n';

/**
 * Languages a reader can switch recipe content into. `fr` is the base.
 * Vietnamese (`vi`) is plumbed end-to-end but not launched yet — re-add `'vi'`
 * here (and it reappears in both the reader switcher and the writer panel) when
 * it's ready. Its label already lives under `language.vi` in fr.json.
 */
export const CONTENT_LANGUAGES = ['fr', 'en'] as const;
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

// Sync the UI-text engine to the stored choice at module load — before React's
// first render — so the interface paints in the right language with no French
// flash. Runs once; subsequent changes go through setLang below.
void i18n.changeLanguage(readStored());

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<ContentLanguage>(readStored);

  const setLang = useCallback((next: ContentLanguage) => {
    setLangState(next);
    localStorage.setItem(STORAGE_KEY, next);
    // flip the whole UI live: every useTranslation() consumer re-renders
    void i18n.changeLanguage(next);
  }, []);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return createElement(LanguageContext.Provider, { value }, children);
}

export function useContentLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useContentLanguage must be used within <LanguageProvider>');
  return ctx;
}
