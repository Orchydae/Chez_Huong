import { describe, it, expect } from 'vitest';
import { apiErrorKey } from './apiError';
import { ApiError } from '../api/client';

describe('apiErrorKey', () => {
  describe('shared defaults (no overrides)', () => {
    it('maps status 0 to the network key', () => {
      expect(apiErrorKey(new ApiError(0, 'network'))).toBe('common.errorNetwork');
    });

    it('maps 403 to the forbidden key', () => {
      expect(apiErrorKey(new ApiError(403, 'Forbidden'))).toBe('common.errorForbidden');
    });

    it('maps any other status to the generic key', () => {
      expect(apiErrorKey(new ApiError(500, 'boom'))).toBe('common.errorGeneric');
      expect(apiErrorKey(new ApiError(404, 'gone'))).toBe('common.errorGeneric');
      expect(apiErrorKey(new ApiError(409, 'dup'))).toBe('common.errorGeneric');
    });
  });

  describe('non-ApiError input', () => {
    it('falls back to generic for a plain Error', () => {
      expect(apiErrorKey(new Error('boom'))).toBe('common.errorGeneric');
    });

    it('falls back to generic for non-error values', () => {
      expect(apiErrorKey('a string')).toBe('common.errorGeneric');
      expect(apiErrorKey(undefined)).toBe('common.errorGeneric');
      expect(apiErrorKey(null)).toBe('common.errorGeneric');
    });
  });

  describe('string overrides', () => {
    it('returns the override key for a matching status', () => {
      expect(apiErrorKey(new ApiError(409, 'dup'), { 409: 'links.errorDuplicate' })).toBe(
        'links.errorDuplicate',
      );
    });

    it('wins over a shared default (e.g. an override for 403)', () => {
      expect(apiErrorKey(new ApiError(403, 'x'), { 403: 'custom.forbidden' })).toBe(
        'custom.forbidden',
      );
    });

    it('wins over the network default (an override for 0)', () => {
      expect(apiErrorKey(new ApiError(0, 'x'), { 0: 'custom.net' })).toBe('custom.net');
    });

    it('ignores overrides for statuses other than the error status', () => {
      expect(apiErrorKey(new ApiError(500, 'x'), { 400: 'form.errorValidation' })).toBe(
        'common.errorGeneric',
      );
    });
  });

  describe('function overrides (keyword matching)', () => {
    const passwordOr404 = {
      400: (message: string) =>
        message.includes('password')
          ? 'auth.passwordHint'
          : message.includes('email')
            ? 'auth.errorEmailInvalid'
            : undefined,
    };

    it('returns the key the resolver produces', () => {
      expect(apiErrorKey(new ApiError(400, 'Password too weak'), passwordOr404)).toBe(
        'auth.passwordHint',
      );
      expect(apiErrorKey(new ApiError(400, 'Email already used'), passwordOr404)).toBe(
        'auth.errorEmailInvalid',
      );
    });

    it('passes the resolver a LOWERCASED message', () => {
      // 'PASSWORD' only matches because the resolver receives it lowercased
      expect(apiErrorKey(new ApiError(400, 'PASSWORD invalid'), passwordOr404)).toBe(
        'auth.passwordHint',
      );
    });

    it('falls through to the generic default when the resolver returns undefined', () => {
      expect(apiErrorKey(new ApiError(400, 'some other reason'), passwordOr404)).toBe(
        'common.errorGeneric',
      );
    });

    it('falls through to the STATUS default (not generic) when the resolver returns undefined', () => {
      // a 0-status resolver that opts out must still land on the network default
      expect(apiErrorKey(new ApiError(0, 'x'), { 0: () => undefined })).toBe(
        'common.errorNetwork',
      );
    });
  });
});
