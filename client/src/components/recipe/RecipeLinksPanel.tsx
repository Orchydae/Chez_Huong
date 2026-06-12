import { Link } from 'react-router-dom';
import { Link2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRecipeLinks } from '../../api/recipes.api';
import type { LinkedRecipeSummary, RecipeLinksResponse } from '../../api/types';
import { FALLBACK_RECIPE_IMAGE } from '../../lib/constants';

interface LinkGroup {
  /** i18n key under links.* */
  labelKey: string;
  recipes: LinkedRecipeSummary[];
}

/**
 * Both directions, grouped for the reader. PAIRS_WITH is symmetric, so its
 * outgoing and incoming rows merge into one group (deduped — both authors may
 * have linked the same pair); USES / VARIATION_OF read differently by
 * direction and keep separate labels ("Utilise" vs "Utilisée dans").
 */
function buildGroups(links: RecipeLinksResponse): LinkGroup[] {
  const byKind = (kind: string, direction: 'outgoing' | 'incoming') =>
    links[direction]
      .filter(l => l.kind === kind)
      .map(l => (direction === 'outgoing' ? l.to : l.from));

  const pairsWith = [...byKind('PAIRS_WITH', 'outgoing'), ...byKind('PAIRS_WITH', 'incoming')];
  const seen = new Set<number>();
  const pairsWithDeduped = pairsWith.filter(r => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  return [
    { labelKey: 'pairsWith', recipes: pairsWithDeduped },
    { labelKey: 'uses', recipes: byKind('USES', 'outgoing') },
    { labelKey: 'variationOf', recipes: byKind('VARIATION_OF', 'outgoing') },
    { labelKey: 'usedIn', recipes: byKind('USES', 'incoming') },
    { labelKey: 'variations', recipes: byKind('VARIATION_OF', 'incoming') },
  ].filter(group => group.recipes.length > 0);
}

/**
 * Reader-facing related recipes (the M3 headline feature). Navigation only —
 * nothing composes across a link. Renders nothing while loading, on error, or
 * when the recipe has no visible links.
 */
export default function RecipeLinksPanel({ recipeId }: { recipeId: number }) {
  const { t } = useTranslation();
  const { data } = useRecipeLinks(recipeId);

  if (!data) return null;
  const groups = buildGroups(data);
  if (groups.length === 0) return null;

  return (
    <section aria-labelledby="links-heading" className="pb-12">
      <h2 id="links-heading" className="mb-6 flex items-center gap-3 text-3xl">
        <Link2 size={26} aria-hidden className="text-forest/40" />
        {t('links.title')}
      </h2>
      <div className="flex flex-col gap-6">
        {groups.map(group => (
          <div key={group.labelKey}>
            <h3 className="mb-3 text-sm font-medium tracking-wide text-forest/60 uppercase">
              {t(`links.${group.labelKey}`)}
            </h3>
            <ul className="flex flex-wrap gap-3">
              {group.recipes.map(recipe => (
                <li key={recipe.id}>
                  <Link
                    to={`/recipes/${recipe.slug}`}
                    className="flex items-center gap-3 rounded-xl bg-white p-2 pr-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <img
                      src={recipe.imageUrl ?? FALLBACK_RECIPE_IMAGE}
                      alt=""
                      loading="lazy"
                      className="h-12 w-16 rounded-lg object-cover"
                    />
                    <span className="text-sm font-medium">{recipe.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
