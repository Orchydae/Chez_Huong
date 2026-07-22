import { Link } from 'react-router-dom';
import { Clock, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Recipe } from '../../api/types';
import { useRecipeLike } from './useRecipeLike';
import { formatTotalTime } from '../../lib/format';
import { FALLBACK_RECIPE_IMAGE } from '../../lib/constants';

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  const { t } = useTranslation();
  const { liked, count, toggle } = useRecipeLike({ from: 'row', recipe });

  const totalTime = formatTotalTime(
    recipe.prepTime,
    recipe.prepTimeUnit,
    recipe.cookTime,
    recipe.cookTimeUnit,
    { hours: t('timeUnit.HOURS'), minutes: t('timeUnit.MINUTES') },
  );

  return (
    // The whole card navigates via the stretched overlay link (a button may
    // not nest inside an anchor); the heart sits on a higher layer.
    // Transparent fill (the cream page shows through, and cut-out dish PNGs sit
    // on it) with a soft forest-tinted shadow for depth. Deliberately NOT
    // overflow-hidden: on hover the dish image lifts up and out of the top edge.
    <div className="group relative z-0 flex flex-col rounded-2xl shadow-[0_8px_24px_-8px_rgba(25,47,1,0.30)] transition hover:z-10 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-10px_rgba(25,47,1,0.42)]">
      <Link
        to={`/recipes/${recipe.slug}`}
        className="absolute inset-0 z-10"
        aria-label={recipe.title}
      />

      {/* Cut-out dish PNGs: object-contain keeps the whole cut-out visible on
          the cream; on hover it grows from its base and lifts out of the frame.
          origin-bottom anchors the "rooted then rising" feel. The like button
          lives inside this box so it pins to the image's bottom-right corner
          (the card's own bottom-right is taken by the time/likes footer). */}
      <div className="relative aspect-[4/3]">
        <img
          src={recipe.imageUrl ?? FALLBACK_RECIPE_IMAGE}
          alt={recipe.title}
          loading="lazy"
          className="h-full w-full origin-bottom object-contain drop-shadow-[0_6px_8px_rgba(25,47,1,0.18)] transition duration-300 ease-out group-hover:drop-shadow-[0_22px_20px_rgba(25,47,1,0.30)] motion-safe:group-hover:-translate-y-[3%] motion-safe:group-hover:scale-[1.15]"
        />

        <button
          type="button"
          aria-pressed={liked}
          aria-label={liked ? t('social.unlike') : t('social.like')}
          // after: extends the touch target to ~50px (the visible circle stays
          // 34px) so a near-miss toggles the like instead of falling through to
          // the stretched card link below — no visual change at any width
          className="absolute right-2.5 bottom-2.5 z-20 rounded-full bg-white/85 p-2 shadow-sm backdrop-blur-sm transition after:absolute after:-inset-2 after:content-[''] hover:scale-110"
          onClick={toggle}
        >
          <Heart size={18} className={liked ? 'fill-coral text-coral' : 'text-forest'} />
        </button>
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
              <span aria-hidden>{count}</span>
              <span className="sr-only">{t('recipe.likeCount', { count })}</span>
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
