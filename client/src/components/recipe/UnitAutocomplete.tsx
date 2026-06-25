import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UNIT_OPTION_KEYS } from '../../lib/units';

interface UnitAutocompleteProps {
  value: string;
  onChange: (unit: string) => void;
  /** Input styling, kept in step with the form's other fields. */
  inputClassName: string;
}

// Accent/period-insensitive fold for matching what's typed against the offered
// labels — display-only filtering, never used for storage (the raw text the
// author types or picks is what gets saved; the server normalizes it). Mirrors
// the spirit of the server's normalizeUnit so "ca", "c. à" and "càt" all
// surface the spoon units.
function fold(value: string): string {
  return value
    .toLowerCase()
    .replace(/[àâä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[îïì]/g, 'i')
    .replace(/[ôö]/g, 'o').replace(/[ûüù]/g, 'u').replace(/ç/g, 'c')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The unit field: a free-text input backed by a localized suggestion list.
 * Focusing shows every available unit (in the active language); typing filters
 * them. Picking one fills the field; the author can still type anything —
 * units stay free text and the server normalizes them for nutrition. Labels
 * come from `unitOption.*` via t(), so they follow the app language switch live.
 */
export default function UnitAutocomplete({ value, onChange, inputClassName }: UnitAutocompleteProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const labels = UNIT_OPTION_KEYS.map(key => t(`unitOption.${key}`));

  const typed = fold(value);
  // empty field → browse every unit; otherwise substring match, hiding the one
  // that already equals what's typed (nothing left to suggest)
  const matches = labels.filter(label => {
    const f = fold(label);
    return typed === '' ? true : f.includes(typed) && f !== typed;
  });

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="relative w-20" ref={ref}>
      <input
        className={`${inputClassName} w-full`}
        placeholder={t('form.unitPlaceholder')}
        value={value}
        onFocus={() => setOpen(true)}
        onChange={e => {
          onChange(e.target.value);
          setOpen(true);
        }}
      />
      {open && matches.length > 0 && (
        // w-max grows the panel to the widest label ("c. à soupe"); min-w-full
        // keeps it at least as wide as the narrow (w-20) field
        <ul className="absolute z-20 mt-1 max-h-56 w-max min-w-full overflow-auto rounded-lg border border-forest/10 bg-white py-1 shadow-lg">
          {matches.map(label => (
            <li key={label}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-cream"
                // mouseDown fires before the input's blur, so the pick lands
                onMouseDown={() => {
                  onChange(label);
                  setOpen(false);
                }}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
