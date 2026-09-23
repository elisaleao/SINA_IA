import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { localStorageTokenStore } from '../token-store';

describe('localStorageTokenStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null for access and refresh tokens when nothing was stored', () => {
    expect(localStorageTokenStore.getAccessToken()).toBeNull();
    expect(localStorageTokenStore.getRefreshToken()).toBeNull();
  });

  it('stores and retrieves the access and refresh tokens', () => {
    localStorageTokenStore.setTokens('access-123', 'refresh-456');

    expect(localStorageTokenStore.getAccessToken()).toBe('access-123');
    expect(localStorageTokenStore.getRefreshToken()).toBe('refresh-456');
  });

  it('clears both tokens', () => {
    localStorageTokenStore.setTokens('access-123', 'refresh-456');

    localStorageTokenStore.clear();

    expect(localStorageTokenStore.getAccessToken()).toBeNull();
    expect(localStorageTokenStore.getRefreshToken()).toBeNull();
  });

  describe('without window (SSR)', () => {
    beforeEach(() => {
      vi.stubGlobal('window', undefined);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('returns null instead of throwing', () => {
      expect(localStorageTokenStore.getAccessToken()).toBeNull();
      expect(localStorageTokenStore.getRefreshToken()).toBeNull();
    });

    it('does not throw when setting or clearing tokens', () => {
      expect(() => localStorageTokenStore.setTokens('a', 'b')).not.toThrow();
      expect(() => localStorageTokenStore.clear()).not.toThrow();
    });
  });
});
