import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Link2, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  searchRecipesByTitle,
  useCreateRecipeLink,
  useDeleteRecipeLink,
  useRecipeLinks,
} from '../../api/recipes.api';
import type { Recipe, RecipeLinkKind } from '../../api/types';
import { RECIPE_LINK_KIND_VALUES } from '../../api/types';
import { ApiError } from '../../api/client';
import { toast } from '../../lib/toast';
import Spinner from '../ui/Spinner';

const KIND_LABEL_KEY: Record<RecipeLinkKind, string> = {
  PAIRS_WITH: 'pairsWith',
  USES: 'uses',
  VARIATION_OF: 'variationOf',
};

/**
 * Authors manage outgoing links from the edit screen (only outgoing — a link
 * belongs to its source recipe). Each add/remove is its own immediate API
 * call, independent of the form's save button — the hint line says so.
 *
 * The target picker is Discovery-backed search-as-you-type (same sequencing
 * discipline as IngredientAutocomplete: a stale response must never land).
 * Discovery only returns PUBLISHED recipes — exactly the linkable set.
 */
export default function RecipeLinkManager({ recipeId }: { recipeId: number }) {
  const { t } = useTranslation();
  const { data: links } = useRecipeLinks(recipeId);
  const createLink = useCreateRecipeLink(recipeId);
  const deleteLink = useDeleteRecipeLink(recipeId);

  const [kind, setKind] = useState<RecipeLinkKind>('PAIRS_WITH');
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<Recipe[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    const timer = timerRef;
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const cancelSearch = () => {
    seqRef.current++;
    if (timerRef.current) clearTimeout(timerRef.current);
    setSearching(false);
  };

  const handleType = (value: string) => {
    setSearch(value);
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
      searchRecipesByTitle(value.trim())
        .then(results => {
          if (seq !== seqRef.current) return;
          setSuggestions(results);
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

  const reportError = (err: unknown) => {
    // raw (English) server text goes to the console only — the rule
    console.error(err);
    if (err instanceof ApiError && err.status === 409) toast.error(t('links.errorDuplicate'));
    // 400 = self-link or own-draft target; 404 = target gone (or a draft
    // hidden from this caller — the server answers as if it doesn't exist)
    else if (err instanceof ApiError && (err.status === 400 || err.status === 404))
      toast.error(t('links.errorTarget'));
    else if (err instanceof ApiError && err.status === 403) toast.error(t('common.errorForbidden'));
    else if (err instanceof ApiError && err.status === 0) toast.error(t('common.errorNetwork'));
    else toast.error(t('common.errorGeneric'));
  };

  const handleSelect = async (target: Recipe) => {
    cancelSearch();
    setOpen(false);
    setSuggestions([]);
    setSearch('');
    try {
      await createLink.mutateAsync({ toId: target.id, kind });
      toast.success(t('links.added'));
    } catch (err) {
      reportError(err);
    }
  };

  const handleRemove = async (linkId: number) => {
    if (removingId !== null) return;
    setRemovingId(linkId);
    try {
      await deleteLink.mutateAsync(linkId);
      toast.success(t('links.removed'));
    } catch (err) {
      reportError(err);
    } finally {
      setRemovingId(null);
    }
  };

  // never suggest the recipe itself (self-link) or a target already linked
  // with the selected kind (exact duplicate) — both would only earn a 4xx
  const excludedIds = new Set<number>([
    recipeId,
    ...(links?.outgoing.filter(l => l.kind === kind).map(l => l.toId) ?? []),
  ]);
  const visibleSuggestions = suggestions.filter(r => !excludedIds.has(r.id));

  return (
    <section aria-labelledby="link-manager-heading" className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6">
      <h2 id="link-manager-heading" className="mb-1 flex items-center gap-3 text-3xl">
        <Link2 size={26} aria-hidden className="text-forest/40" />
        {t('links.manageTitle')}
      </h2>
      <p className="mb-6 text-sm text-forest/60">{t('links.manageHint')}</p>

      {links && links.outgoing.length > 0 && (
        <ul className="mb-6 divide-y divide-forest/10 rounded-2xl bg-white shadow-sm">
          {links.outgoing.map(link => (
            <li key={link.id} className="flex flex-wrap items-center gap-3 p-3">
              <span className="rounded-full bg-leaf/40 px-3 py-1 text-xs font-medium text-forest">
                {t(`links.${KIND_LABEL_KEY[link.kind]}`)}
              </span>
              <Link
                to={`/recipes/${link.to.slug}`}
                className="min-w-0 flex-1 truncate text-sm underline-offset-2 hover:underline"
              >
                {link.to.title}
              </Link>
              <button
                type="button"
                aria-label={t('links.remove')}
                disabled={removingId !== null}
                className="rounded-full p-2 text-coral/70 transition hover:bg-coral/10 hover:text-coral disabled:opacity-50"
                onClick={() => void handleRemove(link.id)}
              >
                {removingId === link.id ? <Spinner size={16} /> : <Trash2 size={16} />}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <select
          aria-label={t('links.kindLabel')}
          className="rounded-lg border border-forest/20 bg-white px-3 py-2 text-base outline-none focus:border-forest sm:text-sm"
          value={kind}
          onChange={e => setKind(e.target.value as RecipeLinkKind)}
        >
          {RECIPE_LINK_KIND_VALUES.map(value => (
            <option key={value} value={value}>
              {t(`links.${KIND_LABEL_KEY[value]}`)}
            </option>
          ))}
        </select>

        <div className="relative flex-1">
          <input
            className="w-full rounded-lg border border-forest/20 bg-white px-3 py-2 text-base outline-none focus:border-forest sm:text-sm"
            placeholder={t('links.searchPlaceholder')}
            aria-label={t('links.searchPlaceholder')}
            value={search}
            disabled={createLink.isPending}
            onChange={e => handleType(e.target.value)}
            onBlur={() => {
              // mouseDown on a suggestion fires before blur, so picks are safe
              cancelSearch();
              setTimeout(() => setOpen(false), 200);
            }}
          />
          {createLink.isPending && (
            <span className="absolute top-1/2 right-3 -translate-y-1/2">
              <Spinner size={16} />
            </span>
          )}
          {open && (visibleSuggestions.length > 0 || searching) && (
            <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-forest/10 bg-white py-1 shadow-lg">
              {searching && (
                <li className="px-3 py-2 text-xs text-forest/50">{t('form.searching')}</li>
              )}
              {visibleSuggestions.map(recipe => (
                <li key={recipe.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-cream"
                    onMouseDown={() => void handleSelect(recipe)}
                  >
                    {recipe.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {open && !searching && visibleSuggestions.length === 0 && (
            <p className="mt-1 text-xs text-forest/50">{t('links.noResults')}</p>
          )}
        </div>
      </div>
    </section>
  );
}
