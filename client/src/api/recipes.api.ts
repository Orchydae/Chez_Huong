/*
 * Recipes: discovery, reads (slug canonical), authoring, lifecycle, uploads.
 * Reads carry the login token automatically (client.ts), so authors see their
 * own Drafts; anonymous readers get 404 on Drafts — same rule as the server.
 */
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api, ApiError } from './client';
import type {
  CreateRecipeLinkPayload,
  CreateRecipePayload,
  DiscoveryParams,
  Recipe,
  RecipeLinksResponse,
  RecipeLinkWithTarget,
  RecipeNutrition,
  UpdateRecipePayload,
} from './types';

export const recipeKeys = {
  all: ['recipes'] as const,
  lists: () => [...recipeKeys.all, 'list'] as const,
  list: (params: DiscoveryParams) => [...recipeKeys.lists(), params] as const,
  // under lists() so every write that invalidates lists refreshes it too
  mine: () => [...recipeKeys.lists(), 'mine'] as const,
  // also under lists(): toggling a like invalidates lists(), so un-saving a
  // recipe drops it from the saved list without any extra wiring
  liked: () => [...recipeKeys.lists(), 'liked'] as const,
  detail: (ref: string | number) => [...recipeKeys.all, 'detail', String(ref)] as const,
  links: (id: number) => [...recipeKeys.all, 'links', id] as const,
  nutrition: (id: number) => [...recipeKeys.all, 'nutrition', id] as const,
};

// ─── Reads ─────────────────────────────────────────────────────────────

export const DISCOVERY_PAGE_SIZE = 12;

/**
 * Paginated Discovery. The server has no total count, so "is there more?"
 * is inferred: a full page means probably yes, a short page means no.
 */
export function useDiscovery(params: Omit<DiscoveryParams, 'take' | 'skip'> = {}) {
  return useInfiniteQuery({
    queryKey: recipeKeys.list(params),
    queryFn: ({ pageParam }) =>
      api.get<Recipe[]>('/recipes', { ...params, take: DISCOVERY_PAGE_SIZE, skip: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === DISCOVERY_PAGE_SIZE ? allPages.length * DISCOVERY_PAGE_SIZE : undefined,
    // filter changes keep the previous grid on screen (dimmed) instead of
    // unmounting it — unmounting mid-click swallows recipe-card clicks
    placeholderData: keepPreviousData,
  });
}

/**
 * Read by slug or numeric id ("both work, slug canonical" — the page redirects
 * an id URL to the slug once the recipe arrives).
 */
export function useRecipe(slugOrId: string) {
  const isNumeric = /^\d+$/.test(slugOrId);
  return useQuery({
    queryKey: recipeKeys.detail(slugOrId),
    queryFn: () =>
      isNumeric
        ? api.get<Recipe>(`/recipes/${slugOrId}`)
        : api.get<Recipe>(`/recipes/slug/${encodeURIComponent(slugOrId)}`),
    retry: (failureCount, error) =>
      // a 404 is an answer (draft hidden / gone), not a flake — don't retry
      failureCount < 2 && !(error instanceof ApiError && error.status === 404),
  });
}

/** The caller's own recipes, Drafts included (writer/admin endpoint). */
export function useMyRecipes() {
  return useQuery({
    queryKey: recipeKeys.mine(),
    queryFn: () => api.get<Recipe[]>('/recipes/mine'),
  });
}

/** The caller's saved list — recipes they liked (M5). PUBLISHED only, newest-saved first. */
export function useLikedRecipes() {
  return useQuery({
    queryKey: recipeKeys.liked(),
    queryFn: () => api.get<Recipe[]>('/recipes/liked'),
  });
}

// ─── Writes ────────────────────────────────────────────────────────────

export function useCreateRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRecipePayload) => api.post<Recipe>('/recipes', payload),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: recipeKeys.all }),
  });
}

/**
 * After any write, push the server's response straight into both detail cache
 * entries (id + slug) BEFORE invalidating lists. Invalidation alone is not
 * enough: navigating away cancels the refetch, and a later visit to the edit
 * screen would seed the form from the stale pre-save row — a silent lost
 * update, because PUT replaces the whole recipe aggregate.
 */
function useRecipeWrite<TVars>(mutationFn: (vars: TVars) => Promise<Recipe>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: saved => {
      queryClient.setQueryData(recipeKeys.detail(saved.id), saved);
      queryClient.setQueryData(recipeKeys.detail(saved.slug), saved);
      void queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
      // a PUT can change ingredients — recompute the (derived) nutrition
      void queryClient.invalidateQueries({ queryKey: recipeKeys.nutrition(saved.id) });
    },
  });
}

export function useUpdateRecipe() {
  return useRecipeWrite(({ id, payload }: { id: number; payload: UpdateRecipePayload }) =>
    api.put<Recipe>(`/recipes/${id}`, payload),
  );
}

/** Publishing is its own endpoint — a `status` field in a PUT body is ignored. */
export function usePublishRecipe() {
  return useRecipeWrite((id: number) => api.patch<Recipe>(`/recipes/${id}/publish`));
}

export function useUnpublishRecipe() {
  return useRecipeWrite((id: number) => api.patch<Recipe>(`/recipes/${id}/unpublish`));
}

/** Delete a recipe (cascade). Evicts both detail cache entries (id + slug). */
export function useDeleteRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; slug: string }) => api.delete<void>(`/recipes/${id}`),
    onSuccess: (_, { id, slug }) => {
      queryClient.removeQueries({ queryKey: recipeKeys.detail(id) });
      queryClient.removeQueries({ queryKey: recipeKeys.detail(slug) });
      void queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
    },
  });
}

// ─── Links (M3) ────────────────────────────────────────────────────────

/**
 * Both directions, draft ends already filtered out server-side. Links are
 * navigation only — nothing (ingredients/steps/nutrition) composes across one.
 */
export function useRecipeLinks(recipeId: number) {
  return useQuery({
    queryKey: recipeKeys.links(recipeId),
    queryFn: () => api.get<RecipeLinksResponse>(`/recipes/${recipeId}/links`),
  });
}

/**
 * Author/admin only. The server rejects self-links and draft targets (400)
 * and exact duplicates (409) — surfaced to the caller as ApiError, mapped to
 * localized messages at the component.
 */
export function useCreateRecipeLink(recipeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRecipeLinkPayload) =>
      api.post<RecipeLinkWithTarget>(`/recipes/${recipeId}/links`, payload),
    onSuccess: (_, payload) => {
      void queryClient.invalidateQueries({ queryKey: recipeKeys.links(recipeId) });
      // the link also surfaces as `incoming` on the target's links read
      void queryClient.invalidateQueries({ queryKey: recipeKeys.links(payload.toId) });
    },
  });
}

export function useDeleteRecipeLink(recipeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (linkId: number) => api.delete<void>(`/recipes/${recipeId}/links/${linkId}`),
    onSuccess: (_, linkId) => {
      // recover the other end from the still-cached list BEFORE invalidating,
      // so the target's incoming view refreshes too
      const cached = queryClient.getQueryData<RecipeLinksResponse>(recipeKeys.links(recipeId));
      const toId = cached?.outgoing.find(link => link.id === linkId)?.toId;
      void queryClient.invalidateQueries({ queryKey: recipeKeys.links(recipeId) });
      if (toId !== undefined) {
        void queryClient.invalidateQueries({ queryKey: recipeKeys.links(toId) });
      }
    },
  });
}

/**
 * Title search for the link picker — Discovery under the hood, so it only
 * ever returns PUBLISHED recipes, which is exactly the set a link may target.
 */
export function searchRecipesByTitle(q: string, take = 8): Promise<Recipe[]> {
  return api.get<Recipe[]>('/recipes', { q, take });
}

// ─── Nutrition ─────────────────────────────────────────────────────────

/**
 * Computed on demand server-side from per-100g ingredient data; never
 * persisted. Same draft visibility as the recipe read.
 */
export function useRecipeNutrition(recipeId: number) {
  return useQuery({
    queryKey: recipeKeys.nutrition(recipeId),
    queryFn: () => api.get<RecipeNutrition>(`/recipes/${recipeId}/nutrition`),
  });
}

/** Upload one image (recipe hero or step photo); returns its public URL. */
export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const { imageUrl } = await api.postForm<{ imageUrl: string }>('/recipes/upload-image', formData);
  return imageUrl;
}
