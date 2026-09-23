import { createApiClient } from './client';
import { localStorageTokenStore } from './token-store';

export { ApiError } from './client';
export type { ApiClient, RequestOptions } from './client';
export type { TokenStore } from './token-store';

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
).replace(/\/$/, '');

export const apiClient = createApiClient({
  baseUrl: API_BASE_URL,
  tokenStore: localStorageTokenStore,
});
