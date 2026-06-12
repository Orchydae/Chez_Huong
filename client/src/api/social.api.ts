/*
 * Social: likes & comments. All routes are recipe-scoped and draft-aware on
 * the server (a hidden draft answers 404 — same rule as the recipe read), so
 * these hooks only run from pages that already resolved the recipe.
 *
 * Cache note: likedByMe is viewer-specific, but the query cache is wiped at
 * every auth boundary (AuthProvider clears it on login/logout/401/expiry and
 * on cross-tab token changes via the 'storage' event), so a likes entry can
 * never leak from one account to the next.
 */
import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { recipeKeys } from './recipes.api';
import type { Comment, LikeStatus, LikeToggleResult } from './types';

export const socialKeys = {
  likes: (recipeId: number) => ['social', 'likes', recipeId] as const,
  comments: (recipeId: number) => ['social', 'comments', recipeId] as const,
  // deeper-reply subtrees are keyed by comment id only (recipe-agnostic) — one
  // recipe page is mounted at a time, so the broad prefix invalidation is bounded
  repliesAll: ['social', 'replies'] as const,
  replies: (commentId: number) => ['social', 'replies', commentId] as const,
};

// ─── Likes ─────────────────────────────────────────────────────────────

export function useLikeStatus(recipeId: number) {
  return useQuery({
    queryKey: socialKeys.likes(recipeId),
    queryFn: () => api.get<LikeStatus>(`/recipes/${recipeId}/likes`),
  });
}

/**
 * Toggle the caller's like. The response is authoritative (`liked` is the new
 * state), so it is written straight into the likes cache; Discovery lists are
 * invalidated because cards show `_count.likes`.
 */
export function useToggleLike(recipeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<LikeToggleResult>(`/recipes/${recipeId}/like`),
    onSuccess: async result => {
      // a background likes refetch may be in flight — cancel it first, or its
      // pre-toggle response would land after (and overwrite) this write
      await queryClient.cancelQueries({ queryKey: socialKeys.likes(recipeId) });
      const status: LikeStatus = { likeCount: result.likeCount, likedByMe: result.liked };
      queryClient.setQueryData(socialKeys.likes(recipeId), status);
      void queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
    },
  });
}

// ─── Comments ──────────────────────────────────────────────────────────

export function useComments(recipeId: number) {
  return useQuery({
    queryKey: socialKeys.comments(recipeId),
    queryFn: () => api.get<Comment[]>(`/recipes/${recipeId}/comments`),
  });
}

/**
 * "Load more replies" (M5): the next two levels under one comment, fetched
 * lazily — `enabled` flips true only once the reader expands that comment, so
 * a thread of any depth is walked on demand instead of all at once.
 */
export function useCommentReplies(commentId: number, enabled: boolean) {
  return useQuery({
    queryKey: socialKeys.replies(commentId),
    queryFn: () => api.get<Comment[]>(`/comments/${commentId}/replies`),
    enabled,
  });
}

/*
 * Comment writes invalidate the whole conversation instead of patching the
 * cached tree: replies live at arbitrary depth and the server's two-level
 * include is the source of truth for what is visible — a refetch is the simple,
 * always-correct move at this scale. `invalidateThread` covers both the
 * top-level list AND any expanded deeper-reply subtrees, so an edit/reply/delete
 * anywhere in the thread is reflected wherever it is shown.
 */
function invalidateThread(queryClient: QueryClient, recipeId: number) {
  void queryClient.invalidateQueries({ queryKey: socialKeys.comments(recipeId) });
  void queryClient.invalidateQueries({ queryKey: socialKeys.repliesAll });
}

export function useAddComment(recipeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      api.post<Comment>(`/recipes/${recipeId}/comments`, { content }),
    onSuccess: () => invalidateThread(queryClient, recipeId),
  });
}

export function useReplyToComment(recipeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: number; content: string }) =>
      api.post<Comment>(`/comments/${commentId}/reply`, { content }),
    onSuccess: () => invalidateThread(queryClient, recipeId),
  });
}

/** Own comments only — the server answers 403 for anyone else's. */
export function useEditComment(recipeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: number; content: string }) =>
      api.patch<Comment>(`/comments/${commentId}`, { content }),
    onSuccess: () => invalidateThread(queryClient, recipeId),
  });
}

/** Own comments only — the server answers 403 for anyone else's. */
export function useDeleteComment(recipeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: number) => api.delete<void>(`/comments/${commentId}`),
    onSuccess: () => invalidateThread(queryClient, recipeId),
  });
}
