/*
 * Users: the admin-only directory + role management (M7). Every endpoint here
 * is gated to ADMIN server-side — the client mirrors that by mounting the page
 * behind <RequireRole roles={['ADMIN']}>.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Role, SafeUser } from './types';

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (q: string) => [...userKeys.lists(), q] as const,
};

/** Cap on a single fetch — the admin search narrows past this; flagged in the UI if hit. */
export const USERS_PAGE_SIZE = 100;

/**
 * The user directory. `q` matches name OR email server-side (case-insensitive);
 * the previous list stays on screen while a new search resolves.
 */
export function useUsers(q: string) {
  const term = q.trim();
  return useQuery({
    queryKey: userKeys.list(term),
    queryFn: () => api.get<SafeUser[]>('/users', { q: term, take: USERS_PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
}

/**
 * Promote/demote a user. The server refuses to change the caller's OWN role
 * (400) — the UI also disables that row, so this only fires for other users.
 * On success the saved row is patched into every cached directory page in
 * place, then lists are invalidated to reconcile with the server.
 */
export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) =>
      api.patch<SafeUser>(`/users/${id}/role`, { role }),
    onSuccess: updated => {
      queryClient.setQueriesData<SafeUser[]>({ queryKey: userKeys.lists() }, prev =>
        prev?.map(user => (user.id === updated.id ? updated : user)),
      );
      void queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}
