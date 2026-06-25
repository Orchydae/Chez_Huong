/*
 * UI-text setup. The interface is bilingual (French / English): every visible
 * string lives in a locales/<lang>.json file and components reference keys via
 * useTranslation(). The active language is owned by lib/language.ts (one switch
 * drives both the UI chrome and recipe-content display) — it calls
 * i18n.changeLanguage(), which re-renders every useTranslation() consumer live.
 * `fr` stays the fallback so a missing English key degrades to French, never to
 * a raw key. Adding a language = add its JSON file to `resources` here.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './locales/fr.json';
import en from './locales/en.json';

void i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: 'fr', // initial only — language.ts syncs it to the reader's stored choice
  fallbackLng: 'fr',
  interpolation: { escapeValue: false }, // React already escapes
});

export default i18n;
