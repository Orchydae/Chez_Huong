/*
 * useRecipeLike — the single seam for a recipe's Like state.
 *
 * The two Like surfaces (the Discovery / saved-list card heart and the
 * recipe-hero button) each used to derive "liked?" and the count their own way
 * and hand-copy the anonymous-login guard + error toast, so the same heart
 * behaved differently one navigation apart (the card flipped optimistically,
 * the hero disabled and waited). This hook owns all of it — the seed source, one
 * optimism rule, the login guard, and the toggle — and returns just what a heart
 * needs to render. `useToggleLike`'s cache choreography (api/social.api.ts) is
 * deep already and stays there; this composes it.
 */
import { useTranslation } from 'react-i18next';
import type { Recipe } from '../../api/types';
import { useAuth } from '../../api/auth.api';
import { useLikeStatus, useToggleLike } from '../../api/social.api';
import { toast } from '../../lib/toast';
import { useApiErrorToast } from '../../lib/apiError';

/**
 * Where the pre-toggle like state comes from:
 * - `row`: a Discovery / saved-list card, seeded from the recipe row's own like
 *   include (`recipe.likes`, `recipe._count.likes`) — no extra request.
 * - `query`: the recipe hero, which reads `GET /recipes/:id/likes` for the
 *   authoritative count + `likedByMe`, showing `fallbackCount` until it lands.
 */
export type LikeSeed =
  | { from: 'row'; recipe: Recipe }
  | { from: 'query'; recipeId: number; fallbackCount: number };

export interface RecipeLikeState {
  liked: boolean;
  count: number;
  /** A toggle request is in flight. */
  pending: boolean;
  /** Hero only: the likes read hasn't resolved yet (always false for a card). */
  loading: boolean;
  /** Toggle the like: guards anonymous callers with a toast, else fires the
   *  mutation and maps any error through the app-wide policy. */
  toggle: () => void;
}

export function useRecipeLike(seed: LikeSeed): RecipeLikeState {
  const { t } = useTranslation();
  const { user } = useAuth();
  const reportError = useApiErrorToast();

  const recipeId = seed.from === 'row' ? seed.recipe.id : seed.recipeId;
  const isHero = seed.from === 'query';

  // A card never subscribes to the per-recipe likes read (that would be one
  // request per card, 12 a Discovery page); only the hero needs it.
  const status = useLikeStatus(recipeId, isHero);
  const toggleLike = useToggleLike(recipeId);

  // A disabled query still READS the cache, so a card must ignore status.data —
  // otherwise a likes entry the hero cached earlier would shadow the fresher
  // `_count.likes` the list query just delivered on the row. The card's truth is
  // its own row include; only the hero consults the likes read.
  const statusData = isHero ? status.data : undefined;

  // Known state before optimism: the toggle response is the freshest truth, then
  // the hero's likes read, then the seed (row include / fallback count).
  const seededLiked = seed.from === 'row' ? (seed.recipe.likes?.length ?? 0) > 0 : false;
  const seededCount = seed.from === 'row' ? seed.recipe._count.likes : seed.fallbackCount;
  const knownLiked = toggleLike.data?.liked ?? statusData?.likedByMe ?? seededLiked;
  const count = toggleLike.data?.likeCount ?? statusData?.likeCount ?? seededCount;

  // One optimism rule for BOTH surfaces: while the toggle is in flight, show the
  // target state; the mutation response (and the list refetch) reconciles.
  const liked = toggleLike.isPending ? !knownLiked : knownLiked;

  // Hero disables its button until the first likes read lands; a failed read
  // does NOT dead-end it (the toggle response repopulates the cache).
  const loading = isHero && status.data === undefined && !status.isError;

  const toggle = () => {
    if (!user) {
      toast.error(t('social.loginToLike'));
      return;
    }
    if (toggleLike.isPending) return;
    toggleLike.mutate(undefined, { onError: err => reportError(err) });
  };

  return { liked, count, pending: toggleLike.isPending, loading, toggle };
}
