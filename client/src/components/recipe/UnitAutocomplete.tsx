import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UNIT_OPTION_KEYS, foldUnit } from '../../lib/units';

interface UnitAutocompleteProps {
  value: string;
  onChange: (unit: string) => void;
  /** Input styling, kept in step with the form's other fields. */
  inputClassName: string;
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

  const typed = foldUnit(value);
  // empty field → browse every unit; otherwise substring match, hiding the one
  // that already equals what's typed (nothing left to suggest)
  const matches = labels.filter(label => {
    const f = foldUnit(label);
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
