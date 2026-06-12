import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDiscovery } from '../../api/recipes.api';
import {
  DIFFICULTY_VALUES,
  PARTICULARITY_VALUES,
  RECIPE_TYPE_VALUES,
} from '../../api/types';
import { BASE_LOCALE, useContentLanguage } from '../../lib/language';
import RecipeCard from '../../components/recipe/RecipeCard';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';

// text-base below sm so iOS Safari doesn't auto-zoom on focus (<16px triggers it);
// sm:text-sm keeps the desktop sizing unchanged. Same pattern on every text input.
const selectClass =
  'rounded-lg border border-forest/20 bg-white px-3 py-2 text-base outline-none focus:border-forest sm:text-sm';

/** Narrow a raw URL value to a known enum member — junk in a shared URL is ignored. */
function narrow<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

/**
 * Discovery: search (?q from the navbar box), filters, newest/popular sort,
 * load-more pagination. All state lives in the URL so results are shareable
 * and the back button walks through filter changes.
 */
export default function HomePage() {
  const { t } = useTranslation();
  const { lang } = useContentLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get('q')?.trim() || undefined;
  const cuisine = searchParams.get('cuisine') ?? '';
  const difficulty = narrow(searchParams.get('difficulty'), DIFFICULTY_VALUES);
  const type = narrow(searchParams.get('type'), RECIPE_TYPE_VALUES);
  const diet = narrow(searchParams.get('diet'), PARTICULARITY_VALUES);
  const sort = searchParams.get('sort') === 'popular' ? 'popular' : 'newest';

  const {
    data,
    isPending,
    isError,
    isPlaceholderData,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useDiscovery({
    q,
    cuisine: cuisine.trim() || undefined,
    difficulty,
    type,
    diet,
    // the server defaults to newest — only send the non-default
    sort: sort === 'popular' ? 'popular' : undefined,
    // only send a locale when it changes search behaviour (non-base) — keeps
    // the base-language query key stable
    locale: lang !== BASE_LOCALE ? lang : undefined,
  });

  // skip/take pages can drift when a recipe is published mid-browse — dedupe
  // by id so a shifted row never renders twice (duplicate React keys)
  const seen = new Set<number>();
  const recipes = data?.pages.flat().filter(recipe => {
    if (seen.has(recipe.id)) return false;
    seen.add(recipe.id);
    return true;
  });
  // sort is an ordering, not a filter — it can't empty the results, so it
  // doesn't flip the "no results match" message (it does show clear-filters)
  const hasFilters = Boolean(q || cuisine.trim() || difficulty || type || diet);
  const showClear = hasFilters || searchParams.get('sort') !== null;

  const updateParam = (key: string, value: string, options?: { replace?: boolean }) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    }, options);
  };

  const resultsRef = useRef<HTMLElement>(null);

  const scrollToResults = () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    resultsRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  };

  // A search (navbar submit or a shared /?q= link) lands the reader on the
  // results, not the hero. rAF defers past App's ScrollToTop, which resets
  // scroll on navigation and would otherwise win.
  useEffect(() => {
    if (!q) return undefined;
    const id = requestAnimationFrame(() => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      resultsRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    });
    return () => cancelAnimationFrame(id);
  }, [q]);

  const sortPill = (value: 'newest' | 'popular', label: string) => (
    <button
      type="button"
      aria-pressed={sort === value}
      className={`px-4 py-2 transition ${
        sort === value ? 'bg-forest text-cream' : 'bg-white text-forest hover:bg-forest/5'
      }`}
      onClick={() => updateParam('sort', value === 'newest' ? '' : value)}
    >
      {label}
    </button>
  );

  return (
    <div>
      <section className="relative overflow-hidden bg-forest text-cream">
        <img
          src="/viet-hero-1280.webp"
          srcSet="/viet-hero-768.webp 768w, /viet-hero-1280.webp 1280w, /viet-hero-1920.webp 1920w"
          sizes="100vw"
          alt=""
          // LCP element: load eagerly at high priority, never lazy
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* left-heavy wash keeps the light text legible over the bright photo
            while the bowl stays visible on the right */}
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-r from-forest/70 via-forest/45 to-coral/25"
        />
        {/* navbar (h-16) sits above in flow — hero fills the rest of the viewport */}
        <div className="relative mx-auto flex min-h-[calc(100svh-4rem)] flex-col px-6 pt-8 pb-20 sm:px-12 lg:px-16">
          <div className="flex flex-1 items-center gap-25">
            <nav className="hidden flex-[3] flex-col gap-3 pt-6 text-sm sm:flex lg:text-base">
              <button
                type="button"
                className="text-left underline-offset-4 hover:underline"
                onClick={scrollToResults}
              >
                {t('home.recipesLink')}
              </button>
            </nav>
            <div className="flex-[7] py-12">
              <h1 className="text-6xl sm:text-7xl lg:text-8xl 2xl:text-9xl">
                {t('home.heroTitle')}
              </h1>
              <p className="mt-1 font-serif text-3xl text-leaf italic sm:text-4xl lg:text-5xl 2xl:text-6xl">
                {t('home.heroTagline')}
              </p>
              <p className="mt-5 max-w-xl text-sm leading-relaxed opacity-85 sm:text-base lg:max-w-2xl lg:text-lg 2xl:text-xl">
                {t('home.heroSubtitle')}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-cream/20 pt-4 text-xs sm:text-sm lg:text-base">
            <button
              type="button"
              className="flex items-center gap-2 underline-offset-4 hover:underline"
              onClick={scrollToResults}
            >
              <ChevronDown size={14} aria-hidden />
              {t('home.scrollDown')}
            </button>
            <span className="opacity-70">{t('home.established')}</span>
          </div>
        </div>
      </section>

      {/* scroll-mt clears the sticky navbar (h-16) plus a small gap */}
      <section ref={resultsRef} className="mx-auto max-w-7xl scroll-mt-20 px-4 py-10 sm:px-6">
        <h2 className="mb-6 text-3xl">
          {q ? t('discovery.resultsFor', { q }) : t('home.latestRecipes')}
        </h2>

        <div className="mb-8 flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label={t('discovery.sortLabel')}
            className="flex overflow-hidden rounded-full border border-forest/20 text-sm"
          >
            {sortPill('newest', t('discovery.sortNewest'))}
            {sortPill('popular', t('discovery.sortPopular'))}
          </div>

          <select
            aria-label={t('recipe.difficulty')}
            className={selectClass}
            value={difficulty ?? ''}
            onChange={e => updateParam('difficulty', e.target.value)}
          >
            <option value="">{t('discovery.anyDifficulty')}</option>
            {DIFFICULTY_VALUES.map(v => (
              <option key={v} value={v}>
                {t(`difficulty.${v}`)}
              </option>
            ))}
          </select>

          <select
            aria-label={t('discovery.typeLabel')}
            className={selectClass}
            value={type ?? ''}
            onChange={e => updateParam('type', e.target.value)}
          >
            <option value="">{t('discovery.anyType')}</option>
            {RECIPE_TYPE_VALUES.map(v => (
              <option key={v} value={v}>
                {t(`recipeType.${v}`)}
              </option>
            ))}
          </select>

          <select
            aria-label={t('discovery.dietLabel')}
            className={selectClass}
            value={diet ?? ''}
            onChange={e => updateParam('diet', e.target.value)}
          >
            <option value="">{t('discovery.anyDiet')}</option>
            {PARTICULARITY_VALUES.map(v => (
              <option key={v} value={v}>
                {t(`particularity.${v}`)}
              </option>
            ))}
          </select>

          {/* live, URL-controlled (replace: no history entry per keystroke);
              keepPreviousData keeps the grid mounted while results update, so
              the native ✕-clear works and no blur-commit can swallow clicks */}
          <input
            type="search"
            className={selectClass}
            placeholder={t('discovery.cuisinePlaceholder')}
            aria-label={t('recipe.cuisine')}
            value={cuisine}
            onChange={e => updateParam('cuisine', e.target.value, { replace: true })}
          />

          {showClear && (
            <button
              type="button"
              className="text-sm text-forest/60 underline underline-offset-2 hover:text-forest"
              onClick={() => setSearchParams({})}
            >
              {t('discovery.clearFilters')}
            </button>
          )}
        </div>

        {isPending && (
          <div className="flex justify-center py-16">
            <Spinner size={32} />
          </div>
        )}

        {/* full-page error only when there is nothing to show — a failed
            "load more" gets its own message next to the button instead */}
        {isError && !recipes && <p className="py-8 text-coral">{t('home.error')}</p>}

        {recipes && recipes.length === 0 && (
          <p className="py-8 text-forest/60">
            {hasFilters ? t('discovery.noResults') : t('home.empty')}
          </p>
        )}

        {recipes && recipes.length > 0 && (
          <>
            <div
              className={`grid grid-cols-1 gap-6 transition-opacity sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${
                isPlaceholderData ? 'opacity-60' : ''
              }`}
            >
              {recipes.map(recipe => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
            {hasNextPage && (
              <div className="mt-10 flex flex-col items-center gap-3">
                <Button
                  variant="ghost"
                  disabled={isFetchingNextPage}
                  onClick={() => void fetchNextPage()}
                >
                  {isFetchingNextPage && <Spinner size={16} />}
                  {t('discovery.loadMore')}
                </Button>
                {isFetchNextPageError && (
                  <p className="text-sm text-coral">{t('discovery.loadMoreError')}</p>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
