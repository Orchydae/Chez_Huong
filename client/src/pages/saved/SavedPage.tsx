import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLikedRecipes } from '../../api/recipes.api';
import RecipeCard from '../../components/recipe/RecipeCard';
import Spinner from '../../components/ui/Spinner';

/**
 * The reader's saved list (M5): the recipes they've liked, most-recently-saved
 * first. The like button doubles as "save for later", so this is just the
 * caller's likes rendered as a grid. Un-liking from a card here drops it (the
 * like toggle invalidates the recipe lists, which this query lives under).
 */
export default function SavedPage() {
  const { t } = useTranslation();
  const { data: recipes, isPending, isError } = useLikedRecipes();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="mb-2 flex items-center gap-3 text-4xl">
        <Heart size={28} aria-hidden className="fill-coral text-coral" />
        {t('saved.title')}
      </h1>
      <p className="mb-8 text-forest/60">{t('saved.subtitle')}</p>

      {isPending && (
        <div className="flex justify-center py-16">
          <Spinner size={32} />
        </div>
      )}

      {isError && <p className="py-8 text-coral">{t('saved.error')}</p>}

      {recipes && recipes.length === 0 && (
        <div className="flex flex-col items-start gap-3 py-8 text-forest/60">
          <p>{t('saved.empty')}</p>
          <Link to="/" className="text-sm text-leaf underline underline-offset-2">
            {t('saved.discover')}
          </Link>
        </div>
      )}

      {recipes && recipes.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {recipes.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
