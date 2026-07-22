/*
 * The app-wide "server error → localized message" policy, in one place.
 *
 * Every mutation catch site used to hand-copy the same ladder (console the raw
 * error, then pick a toast by status). That smeared the rule across ~9 sites and
 * they had already drifted — some missed the 403 branch, the keyword-match half
 * existed exactly once. This module owns the shared buckets; each call site adds
 * only its 1-2 domain rows.
 *
 * This is the sanctioned "how the 400 → message mapping is organized" work: it
 * maps the server's (English) verdict to a localized KEY by status/keyword — it
 * never re-implements the server's validation rules (the server stays the single
 * source of truth). Raw server text is logged to the console only, never shown.
 */
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../api/client';
import { toast } from './toast';

/**
 * A per-status override. Either a fixed message key, or a resolver over the
 * server's (lowercased) message that returns a key — or `undefined` to fall
 * through to the shared defaults (used for keyword matching, e.g. a 400 whose
 * message mentions "password").
 */
export type ErrorOverride = string | ((message: string) => string | undefined);

/** Per-call override table, keyed by HTTP status. Checked before the defaults. */
export type ErrorOverrides = Record<number, ErrorOverride>;

/**
 * PURE core: map a caught error to a localized message KEY. Owns the shared
 * buckets — 0 → network, 403 → forbidden, everything else → generic — and lets
 * the caller prepend domain rows via `overrides`. No i18n, no DOM, no logging:
 * construct an `ApiError` and assert the returned key.
 */
export function apiErrorKey(err: unknown, overrides: ErrorOverrides = {}): string {
  if (err instanceof ApiError) {
    const override = overrides[err.status];
    if (typeof override === 'string') return override;
    if (typeof override === 'function') {
      const key = override(err.message.toLowerCase());
      if (key !== undefined) return key;
    }
    if (err.status === 0) return 'common.errorNetwork';
    if (err.status === 403) return 'common.errorForbidden';
  }
  return 'common.errorGeneric';
}

/**
 * Toast convenience for the mutation catch sites: logs the raw (English) server
 * error to the console — the rule — then shows the localized toast. Returns a
 * stable `reportError(err, overrides?)` callback.
 *
 * setError-based callers (the auth modals, which render the message inline
 * instead of a toast) use `apiErrorKey` directly.
 */
export function useApiErrorToast(): (err: unknown, overrides?: ErrorOverrides) => void {
  const { t } = useTranslation();
  return useCallback(
    (err: unknown, overrides?: ErrorOverrides) => {
      console.error(err); // raw English stays in the console — never shown to the user
      toast.error(t(apiErrorKey(err, overrides)));
    },
    [t],
  );
}
