import { Link } from 'react-router-dom';
import { Clock, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Recipe } from '../../api/types';
import { useAuth } from '../../api/auth.api';
import { useToggleLike } from '../../api/social.api';
import { ApiError } from '../../api/client';
import { toast } from '../../lib/toast';
import { formatTotalTime } from '../../lib/format';
import { FALLBACK_RECIPE_IMAGE } from '../../lib/constants';

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toggleLike = useToggleLike(recipe.id);

  const totalTime = formatTotalTime(
    recipe.prepTime,
    recipe.prepTimeUnit,
    recipe.cookTime,
    recipe.cookTimeUnit,
    { hours: t('timeUnit.HOURS'), minutes: t('timeUnit.MINUTES') },
  );

  // Freshness ladder: the toggle response is the most recent truth, then the
  // row's own like include (authenticated Discovery). While the POST is in
  // flight the heart shows its target state — the list refetch reconciles.
  const rowLiked = toggleLike.data?.liked ?? (recipe.likes?.length ?? 0) > 0;
  const liked = toggleLike.isPending ? !rowLiked : rowLiked;
  const likeCount = toggleLike.data?.likeCount ?? recipe._count.likes;

  const handleLike = async () => {
    if (!user) {
      toast.error(t('social.loginToLike'));
      return;
    }
    if (toggleLike.isPending) return;
    try {
      await toggleLike.mutateAsync();
    } catch (err) {
      console.error(err);
      if (err instanceof ApiError && err.status === 0) toast.error(t('common.errorNetwork'));
      else toast.error(t('common.errorGeneric'));
    }
  };

  return (
    // The whole card navigates via the stretched overlay link (a button may
    // not nest inside an anchor); the heart sits on a higher layer.
    <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link
        to={`/recipes/${recipe.slug}`}
        className="absolute inset-0 z-10"
        aria-label={recipe.title}
      />

      <button
        type="button"
        aria-pressed={liked}
        aria-label={liked ? t('social.unlike') : t('social.like')}
        // after: extends the touch target to ~50px (the visible circle stays
        // 34px) so a near-miss toggles the like instead of falling through to
        // the stretched card link below — no visual change at any width
        className="absolute top-2.5 right-2.5 z-20 rounded-full bg-white/85 p-2 shadow-sm backdrop-blur-sm transition after:absolute after:-inset-2 after:content-[''] hover:scale-110"
        onClick={() => void handleLike()}
      >
        <Heart size={18} className={liked ? 'fill-coral text-coral' : 'text-forest'} />
      </button>

      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={recipe.imageUrl ?? FALLBACK_RECIPE_IMAGE}
          alt={recipe.title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-xl leading-snug">{recipe.title}</h3>
        <div className="mt-auto flex items-center justify-between text-sm text-forest/60">
          <span>{t(`recipeType.${recipe.type}`)}</span>
          <span className="flex items-center gap-3">
            {/* aria-label on a plain span is ignored by most screen readers —
                visible bare number for sighted users, sr-only sentence for AT */}
            <span className="flex items-center gap-1.5">
              <Heart size={14} aria-hidden />
              <span aria-hidden>{likeCount}</span>
              <span className="sr-only">{t('recipe.likeCount', { count: likeCount })}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={14} aria-hidden />
              {totalTime}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
