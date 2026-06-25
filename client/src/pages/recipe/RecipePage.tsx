import { useMemo, type ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Clock, Edit, EyeOff, Globe, Languages, Puzzle, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRecipe } from '../../api/recipes.api';
import { useRecipeTranslations } from '../../api/translations.api';
import { useAuth } from '../../api/auth.api';
import { ApiError } from '../../api/client';
import { useContentLanguage } from '../../lib/language';
import { localizedName } from '../../lib/localizedName';
import {
  approvedTranslationMap,
  recipeTranslatableFields,
  translationCoverage,
} from '../../lib/recipeFieldPaths';
import Spinner from '../../components/ui/Spinner';
import LikeButton from '../../components/recipe/LikeButton';
import ShareButton from '../../components/recipe/ShareButton';
import CommentThread from '../../components/recipe/CommentThread';
import NutritionPanel from '../../components/recipe/NutritionPanel';
import RecipeLinksPanel from '../../components/recipe/RecipeLinksPanel';
import TranslateRecipePanel from '../../components/recipe/TranslateRecipePanel';

export default function RecipePage() {
  const { slugOrId = '' } = useParams<{ slugOrId: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { lang } = useContentLanguage();
  const { data: recipe, isPending, isError, error } = useRecipe(slugOrId);

  // Reader is viewing a non-base language → pull approved translations and
  // apply them per field, falling back (clearly marked) where none exists.
  const isTranslated = !!recipe && lang !== recipe.locale;
  const { data: translations } = useRecipeTranslations(recipe?.id ?? 0, lang, isTranslated);
  const translated = useMemo(() => approvedTranslationMap(translations), [translations]);
  const fields = useMemo(() => (recipe ? recipeTranslatableFields(recipe) : []), [recipe]);
  const coverage = isTranslated ? translationCoverage(fields, translated) : 1;

  if (isPending) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size={32} />
      </div>
    );
  }

  if (isError || !recipe) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
        <h1 className="text-3xl">{notFound ? t('recipe.notFound') : t('recipe.loadError')}</h1>
        <Link to="/" className="text-sm underline underline-offset-2">
          {t('notFound.backHome')}
        </Link>
      </div>
    );
  }

  // canonical address: an id URL redirects to the slug (the !== guard prevents
  // a replace-loop when a slug is itself purely numeric)
  if (/^\d+$/.test(slugOrId) && recipe.slug && recipe.slug !== slugOrId) {
    return <Navigate to={`/recipes/${recipe.slug}`} replace />;
  }

  const canEdit = user && (user.role === 'ADMIN' || user.userId === recipe.authorId);

  // Resolve one translatable field: the approved translation for the active
  // language, or the base text marked as a fallback. `field` renders it with a
  // small "VO" marker when it fell back.
  const field = (path: string, base: string): ReactNode => {
    if (!isTranslated) return base;
    const value = translated.get(path);
    if (value !== undefined) return value;
    return (
      <>
        {base}
        <sup
          title={t('recipe.originalFallbackTitle')}
          className="ml-1 rounded bg-coral/15 px-1 align-top text-[9px] font-semibold tracking-wide text-coral"
        >
          {t('recipe.originalFallback')}
        </sup>
      </>
    );
  };

  return (
    <div>
      <section
        className="relative bg-forest bg-cover bg-center text-cream"
        style={
          recipe.imageUrl
            ? {
                backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.55)), url(${recipe.imageUrl})`,
              }
            : undefined
        }
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 pt-8 pb-16 sm:px-6 sm:pt-16 sm:pb-24">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 backdrop-blur-sm">
              <Globe size={14} />
              {recipe.locale.toUpperCase()}
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur-sm">
              {t(`recipeType.${recipe.type}`)}
            </span>
            {isTranslated && (
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 backdrop-blur-sm">
                <Languages size={14} />
                {coverage >= 1
                  ? t('recipe.fullyTranslated')
                  : t('recipe.translatedBadge', { percent: Math.round(coverage * 100) })}
              </span>
            )}
            {recipe.status === 'DRAFT' && (
              <span className="flex items-center gap-1.5 rounded-full bg-coral px-3 py-1 font-medium">
                <EyeOff size={14} />
                {t('recipe.draftBadge')}
              </span>
            )}
          </div>
          <h1 className="max-w-3xl text-4xl sm:text-5xl">{field('title', recipe.title)}</h1>
          <div className="flex flex-wrap items-center gap-3">
            {/* a draft has no audience — the heart + share only render once published */}
            {recipe.status === 'PUBLISHED' && (
              <>
                <LikeButton recipeId={recipe.id} fallbackCount={recipe._count.likes} />
                <ShareButton slug={recipe.slug} title={recipe.title} />
              </>
            )}
            {canEdit && (
              <>
                <Link
                  to={`/recipes/${recipe.id}/edit`}
                  className="flex w-fit items-center gap-2 rounded-full border border-cream/40 px-4 py-2 text-sm transition hover:bg-cream/10"
                >
                  <Edit size={16} />
                  {t('recipe.edit')}
                </Link>
                <TranslateRecipePanel recipe={recipe} />
              </>
            )}
          </div>
        </div>
      </section>

      {/* stats bar */}
      <section className="border-b border-forest/10 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-4 gap-y-5 px-4 py-6 sm:grid-cols-3 sm:px-6 lg:grid-cols-5">
          <Stat icon={<Globe size={22} />} label={t('recipe.cuisine')} value={field('cuisine', recipe.cuisine)} />
          <Stat
            icon={<Users size={22} />}
            label={t('recipe.servings')}
            value={String(recipe.servings)}
          />
          <Stat
            icon={<Clock size={22} />}
            label={t('recipe.prepTime')}
            value={`${recipe.prepTime} ${t(`timeUnit.${recipe.prepTimeUnit}`)}`}
          />
          <Stat
            icon={<Clock size={22} />}
            label={t('recipe.cookTime')}
            value={`${recipe.cookTime} ${t(`timeUnit.${recipe.cookTimeUnit}`)}`}
          />
          <Stat
            icon={<Puzzle size={22} />}
            label={t('recipe.difficulty')}
            value={t(`difficulty.${recipe.difficulty}`)}
          />
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* yield + diet tags + description */}
        {(recipe.yield || recipe.particularities.length > 0 || recipe.description) && (
          <section className="flex flex-col gap-4 py-8">
            {recipe.yield && (
              <p className="text-sm text-forest/70">
                <span className="font-medium">{t('recipe.yield')} :</span> {field('yield', recipe.yield)}
              </p>
            )}
            {recipe.particularities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {recipe.particularities.map(p => (
                  <span
                    key={p.id}
                    className="rounded-full bg-leaf/40 px-3 py-1 text-xs font-medium text-forest"
                  >
                    {t(`particularity.${p.type}`)}
                  </span>
                ))}
              </div>
            )}
            {recipe.description && (
              <p className="max-w-3xl text-forest/80">{field('description', recipe.description)}</p>
            )}
          </section>
        )}

        {/* ingredients + steps: stacked on mobile, two columns from lg */}
        <div className="grid grid-cols-1 gap-10 pb-16 lg:grid-cols-[2fr_3fr]">
          <section>
            <h2 className="mb-4 text-3xl">{t('recipe.ingredients')}</h2>
            {recipe.ingredientSections.map((section, si) => (
              <div key={section.id} className="mb-6">
                {section.name && (
                  <h3 className="mb-2 text-xl">
                    {field(`ingredientSection.${si + 1}.name`, section.name)}
                  </h3>
                )}
                <ul className="divide-y divide-forest/10">
                  {section.ingredients.map(row => (
                    <li key={row.id} className="text-sm">
                      {/* check-as-you-cook: per-visit only, the label text names the box */}
                      {/* grid (auto checkbox + minmax(0,1fr) text) so a long
                          ingredient name wraps within the column instead of
                          clipping at the viewport edge */}
                      <label className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-start gap-2.5 py-2">
                        <input
                          type="checkbox"
                          className="peer mt-0.5 size-4 accent-forest"
                        />
                        <span className="break-words transition peer-checked:line-through peer-checked:opacity-45">
                          {row.quantity && (
                            <>
                              <span className="font-semibold">{row.quantity}</span>{' '}
                            </>
                          )}
                          <span className="text-forest/60">{row.unit}</span>{' '}
                          {/* a published recipe used as an ingredient links to
                              that recipe; if it's since been unpublished we show
                              its name without a (hidden, 404-ing) link; a
                              catalogue ingredient shows its localized name; a
                              free-text row shows its displayName */}
                          {row.recipeRef?.status === 'PUBLISHED' ? (
                            <Link
                              to={`/recipes/${row.recipeRef.slug}`}
                              className="font-medium text-coral underline-offset-2 hover:underline"
                              onClick={e => e.stopPropagation()}
                            >
                              {row.recipeRef.title}
                            </Link>
                          ) : row.recipeRef ? (
                            row.recipeRef.title
                          ) : row.ingredient ? (
                            // a per-recipe custom name wins over the catalogue/
                            // translated name (nutrition still comes from the
                            // linked ingredient)
                            row.displayName?.trim() || localizedName(row.ingredient, lang)
                          ) : (
                            row.displayName
                          )}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <NutritionPanel recipeId={recipe.id} />
          </section>

          <section>
            <h2 className="mb-4 text-3xl">{t('recipe.steps')}</h2>
            {recipe.stepSections.map((section, si) => {
              // Continuous step numbering across ALL sections (1, 2, 3…) instead
              // of restarting at 1 in each — the recipe reads as one sequence.
              // Offset = every step in the sections before this one.
              const stepOffset = recipe.stepSections
                .slice(0, si)
                .reduce((sum, s) => sum + s.steps.length, 0);
              return (
                <div key={section.id} className="mb-6">
                  {section.title && (
                    <h3 className="mb-2 text-xl">
                      {field(`stepSection.${si + 1}.title`, section.title)}
                    </h3>
                  )}
                  <ol className="flex flex-col gap-4">
                    {[...section.steps]
                      .sort((a, b) => a.order - b.order)
                      .map((step, sj) => {
                        const number = stepOffset + sj + 1;
                        return (
                          <li key={step.id} className="flex gap-3">
                            <span className="font-serif text-2xl font-bold text-forest/30">
                              {number}.
                            </span>
                            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-start">
                              <p className="flex-1 text-sm leading-relaxed">
                                {field(`stepSection.${si + 1}.step.${sj + 1}.description`, step.description)}
                              </p>
                              {step.mediaUrl && (
                                <img
                                  src={step.mediaUrl}
                                  alt={t('recipe.stepImageAlt', { number })}
                                  loading="lazy"
                                  // reserve a 4:3 box on mobile (full-width, stacked)
                                  // so lazy loads don't shove the step text; desktop
                                  // keeps the natural-ratio w-44 thumbnail
                                  className="aspect-[4/3] w-full rounded-xl object-cover sm:aspect-auto sm:w-44"
                                />
                              )}
                            </div>
                          </li>
                        );
                      })}
                  </ol>
                </div>
              );
            })}
          </section>
        </div>

        <RecipeLinksPanel recipeId={recipe.id} />

        {/* drafts have no audience to converse with — comments wait for publish */}
        {recipe.status === 'PUBLISHED' && (
          <div className="max-w-3xl pb-16">
            <CommentThread recipeId={recipe.id} />
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-forest/50">{icon}</span>
      <div className="flex flex-col">
        <span className="text-xs text-forest/50">{label}</span>
        <span className="text-sm font-medium">{value}</span>
      </div>
    </div>
  );
}
