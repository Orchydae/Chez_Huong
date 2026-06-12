import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { confirmIngredient, searchIngredients } from '../../api/ingredients.api';
import { toast } from '../../lib/toast';
import { useContentLanguage } from '../../lib/language';
import { localizedName } from '../../lib/localizedName';

interface Suggestion {
  /** Ingredient id for local rows, fdcId for USDA matches. */
  id: number;
  name: string;
  isUsda: boolean;
}

interface IngredientAutocompleteProps {
  name: string;
  onType: (name: string) => void;
  /** Fires with a REAL catalogue ingredient id (USDA picks are confirmed first). */
  onSelect: (ingredientId: number, name: string) => void;
}

/**
 * Search-as-you-type over the ingredient catalogue + USDA. Picking a USDA
 * match promotes it into the catalogue (POST /ingredients/confirm) so the
 * recipe always references a real ingredient id.
 *
 * Responses are sequenced: each scheduled search gets a sequence number, and
 * a response only lands if it is still the latest — otherwise a slow USDA
 * lookup for "ga" would overwrite the results for "garlic", and a response
 * arriving after blur/clear would reopen the dropdown over an unfocused field.
 */
export default function IngredientAutocomplete({
  name,
  onType,
  onSelect,
}: IngredientAutocompleteProps) {
  const { t } = useTranslation();
  const { lang } = useContentLanguage();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);

  // setState after unmount is a safe no-op, so in-flight responses need no
  // unmount guard — only the pending debounce timer must be cleared.
  useEffect(() => {
    const timer = timerRef;
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  /** Cancel the pending timer and orphan any in-flight response. */
  const cancelSearch = () => {
    seqRef.current++;
    if (timerRef.current) clearTimeout(timerRef.current);
    setSearching(false);
  };

  const handleType = (value: string) => {
    onType(value);
    cancelSearch();

    if (!value.trim()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const seq = seqRef.current;
    timerRef.current = setTimeout(() => {
      if (seq !== seqRef.current) return;
      setSearching(true);
      searchIngredients(value.trim())
        .then(result => {
          if (seq !== seqRef.current) return;
          setSuggestions([
            ...result.ingredients.map(i => ({ id: i.id, name: localizedName(i, lang), isUsda: false })),
            ...result.matches.map(m => ({ id: m.fdcId, name: m.name, isUsda: true })),
          ]);
          setOpen(true);
        })
        .catch(() => {
          /* search is best-effort; a failed lookup just shows no suggestions */
        })
        .finally(() => {
          if (seq === seqRef.current) setSearching(false);
        });
    }, 400);
  };

  const handleSelect = async (suggestion: Suggestion) => {
    cancelSearch();
    setOpen(false);
    setSuggestions([]);
    if (!suggestion.isUsda) {
      onSelect(suggestion.id, suggestion.name);
      return;
    }
    try {
      const ingredient = await confirmIngredient(suggestion.id, suggestion.name);
      onSelect(ingredient.id, ingredient.name);
    } catch {
      toast.error(t('form.errorIngredientConfirm'));
    }
  };

  return (
    // min-w-0 lets the field shrink instead of overflowing the row; the basis
    // makes it wrap below qty/unit on a narrow (≈360px) authoring screen
    <div className="relative min-w-[55%] flex-1">
      <input
        className="w-full rounded-lg border border-forest/20 bg-white px-3 py-2 text-base outline-none focus:border-forest sm:text-sm"
        placeholder={t('form.ingredientNamePlaceholder')}
        value={name}
        onChange={e => handleType(e.target.value)}
        onBlur={() => {
          // mouseDown on a suggestion fires before blur, so picks are safe;
          // cancelling here guarantees no late response reopens the list
          cancelSearch();
          setTimeout(() => setOpen(false), 200);
        }}
      />
      {open && (suggestions.length > 0 || searching) && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-forest/10 bg-white py-1 shadow-lg">
          {searching && (
            <li className="px-3 py-2 text-xs text-forest/50">{t('form.searching')}</li>
          )}
          {suggestions.map(s => (
            <li key={`${s.isUsda ? 'usda' : 'local'}-${s.id}`}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-cream"
                onMouseDown={() => void handleSelect(s)}
              >
                <span>{s.name}</span>
                {s.isUsda && (
                  <span className="rounded bg-leaf/40 px-1.5 py-0.5 text-[10px] font-semibold text-forest">
                    {t('form.usdaTag')}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
