import { Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../api/auth.api';
import { useLikeStatus, useToggleLike } from '../../api/social.api';
import { ApiError } from '../../api/client';
import { toast } from '../../lib/toast';

interface LikeButtonProps {
  recipeId: number;
  /** The recipe row's `_count.likes` — shown until the likes read resolves. */
  fallbackCount: number;
}

/**
 * Heart toggle + count for the recipe hero (cream-on-dark pill, matching the
 * hero chips). Anyone may read the count; only signed-in readers may toggle —
 * an anonymous click explains itself with a toast instead of failing.
 */
export default function LikeButton({ recipeId, fallbackCount }: LikeButtonProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: status, isError } = useLikeStatus(recipeId);
  const toggleLike = useToggleLike(recipeId);

  const handleClick = async () => {
    if (!user) {
      toast.error(t('social.loginToLike'));
      return;
    }
    try {
      await toggleLike.mutateAsync();
    } catch (err) {
      console.error(err);
      if (err instanceof ApiError && err.status === 0) toast.error(t('common.errorNetwork'));
      else toast.error(t('common.errorGeneric'));
    }
  };

  const liked = status?.likedByMe ?? false;
  const count = status?.likeCount ?? fallbackCount;

  return (
    <button
      type="button"
      aria-pressed={liked}
      // a failed likes read doesn't dead-end the button: the toggle response
      // is authoritative and repopulates the cache on the next click
      disabled={(status === undefined && !isError) || toggleLike.isPending}
      className="flex w-fit items-center gap-2 rounded-full border border-cream/40 px-4 py-2 text-sm transition hover:bg-cream/10 disabled:opacity-60"
      onClick={() => void handleClick()}
    >
      <Heart
        size={16}
        aria-hidden
        className={liked ? 'fill-coral text-coral' : ''}
      />
      <span aria-hidden>{count}</span>
      <span className="sr-only">{t('recipe.likeCount', { count })}</span>
    </button>
  );
}
