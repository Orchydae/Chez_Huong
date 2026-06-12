import { useEffect, useRef, useState } from 'react';
import { Check, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CONTENT_LANGUAGES, useContentLanguage, type ContentLanguage } from '../../lib/language';

/**
 * Reader-facing content-language switch (M4). Picks the language recipes are
 * shown in (falling back to the original where untranslated) and scopes
 * Discovery search to translated text. Independent of the French-only UI chrome.
 */
export default function LanguageSwitcher() {
  const { t } = useTranslation();
  const { lang, setLang } = useContentLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const pick = (next: ContentLanguage) => {
    setLang(next);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('language.label')}
        className="flex items-center gap-1.5 rounded-full border border-cream/30 px-3 py-2 text-sm transition hover:bg-cream/10"
        onClick={() => setOpen(prev => !prev)}
      >
        <Globe size={16} />
        <span className="uppercase">{lang}</span>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-50 mt-2 flex w-40 flex-col rounded-xl bg-cream p-1.5 text-forest shadow-xl"
        >
          {CONTENT_LANGUAGES.map(code => (
            <li key={code}>
              <button
                type="button"
                role="option"
                aria-selected={lang === code}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-forest/5"
                onClick={() => pick(code)}
              >
                {t(`language.${code}`)}
                {lang === code && <Check size={14} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
