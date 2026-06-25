import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { confirmIngredient, searchIngredients } from '../../api/ingredients.api';
import { toast } from '../../lib/toast';
import { useContentLanguage } from '../../lib/language';
import { localizedName } from '../../lib/localizedName';

interface Suggestion {
  /** Ingredient id for local rows, fdcId for USDA matches, recipe id for recipes. */
  id: number;
  name: string;
  kind: 'local' | 'usda' | 'recipe';
}

/**
 * What was picked. A catalogue/USDA pick yields an `ingredient` (USDA is
 * confirmed first so the id is real); picking a recipe yields a `recipe` whose
 * id goes into the row's `recipeRefId` (its nutrition rolls up by servings);
 * "use what I typed" yields `freetext` — a name-only row with NO nutrition and
 * NO catalogue entry (it's stored as the recipe ingredient's displayName).
 */
export type IngredientPick =
  | { type: 'ingredient'; ingredientId: number; name: string }
  | { type: 'recipe'; recipeRefId: number; name: string }
  | { type: 'freetext'; name: string };

interface IngredientAutocompleteProps {
  name: string;
  onType: (name: string) => void;
  onSelect: (pick: IngredientPick) => void;
  /** The recipe being edited — excluded from recipe results so it can't self-reference. */
  excludeRecipeId?: number;
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
  excludeRecipeId,
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
      // open now so the spinner shows, and the "use what you typed" option is
      // reachable even when the search ends up finding nothing
      setOpen(true);
      searchIngredients(value.trim(), excludeRecipeId)
        .then(result => {
          if (seq !== seqRef.current) return;
          setSuggestions([
            ...result.ingredients.map(
              i => ({ id: i.id, name: localizedName(i, lang), kind: 'local' as const }),
            ),
            ...result.recipes.map(r => ({ id: r.id, name: r.title, kind: 'recipe' as const })),
            ...result.matches.map(m => ({ id: m.fdcId, name: m.name, kind: 'usda' as const })),
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
    if (suggestion.kind === 'recipe') {
      onSelect({ type: 'recipe', recipeRefId: suggestion.id, name: suggestion.name });
      return;
    }
    if (suggestion.kind === 'local') {
      onSelect({ type: 'ingredient', ingredientId: suggestion.id, name: suggestion.name });
      return;
    }
    try {
      const ingredient = await confirmIngredient(suggestion.id, suggestion.name);
      onSelect({ type: 'ingredient', ingredientId: ingredient.id, name: ingredient.name });
    } catch {
      toast.error(t('form.errorIngredientConfirm'));
    }
  };

  /** Use exactly what the author typed as a FREE-TEXT ingredient: no catalogue
   *  entry, no nutrition — just a name on this recipe (stored as displayName). */
  const handleUseFreeText = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    cancelSearch();
    setOpen(false);
    setSuggestions([]);
    onSelect({ type: 'freetext', name: trimmed });
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
      {open && name.trim().length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-forest/10 bg-white py-1 shadow-lg">
          {searching && (
            <li className="px-3 py-2 text-xs text-forest/50">{t('form.searching')}</li>
          )}
          {suggestions.map(s => (
            <li key={`${s.kind}-${s.id}`}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-cream"
                onMouseDown={() => void handleSelect(s)}
              >
                <span>{s.name}</span>
                {s.kind === 'usda' && (
                  <span className="rounded bg-leaf/40 px-1.5 py-0.5 text-[10px] font-semibold text-forest">
                    {t('form.usdaTag')}
                  </span>
                )}
                {s.kind === 'recipe' && (
                  <span className="rounded bg-coral/20 px-1.5 py-0.5 text-[10px] font-semibold text-coral">
                    {t('form.recipeTag')}
                  </span>
                )}
              </button>
            </li>
          ))}
          {/* always available: use exactly what was typed as free text, even
              with no match — a not-found ingredient is still usable (no nutrition,
              not stored in the catalogue) */}
          {!searching && (
            <li className="mt-1 border-t border-forest/10 pt-1">
              <button
                type="button"
                className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-sm text-forest/70 hover:bg-cream"
                onMouseDown={() => handleUseFreeText()}
              >
                {t('form.useCustomIngredient', { name: name.trim() })}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
