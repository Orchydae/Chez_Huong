/*
 * UI-text setup. The interface ships French-only but is translation-ready:
 * every visible string lives in locales/fr.json and components reference keys
 * via useTranslation(). Adding a language at M4 = adding a JSON file here.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './locales/fr.json';

void i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr } },
  lng: 'fr',
  fallbackLng: 'fr',
  interpolation: { escapeValue: false }, // React already escapes
});

export default i18n;
