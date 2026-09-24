import type { TokenStore } from './token-store';

export interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
}

export interface ApiClient {
  request<T>(path: string, init?: RequestOptions): Promise<T>;
  stream(path: string, init?: RequestOptions): Promise<Response>;
  onSessionExpired(handler: () => void): () => void;
}

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

export interface CreateApiClientOptions {
  baseUrl: string;
  tokenStore: TokenStore;
  fetchImpl?: typeof fetch;
}

const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh'];

interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
}

export function createApiClient(options: CreateApiClientOptions): ApiClient {
  const { baseUrl, tokenStore } = options;
  const fetchImpl = options.fetchImpl ?? fetch;
  const sessionExpiredHandlers = new Set<() => void>();
  let refreshPromise: Promise<boolean> | null = null;

  function isAuthEndpoint(path: string): boolean {
    return AUTH_ENDPOINTS.some(
      (endpoint) => path === endpoint || path.startsWith(`${endpoint}?`)
    );
  }

  function notifySessionExpired(): void {
    sessionExpiredHandlers.forEach((handler) => handler());
  }

  function onSessionExpired(handler: () => void): () => void {
    sessionExpiredHandlers.add(handler);
    return () => sessionExpiredHandlers.delete(handler);
  }

  async function performRefresh(): Promise<boolean> {
    const currentRefreshToken = tokenStore.getRefreshToken();
    if (!currentRefreshToken) return false;
    try {
      const response = await fetchImpl(buildUrl('/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: currentRefreshToken }),
      });
      if (!response.ok) return false;
      const data = (await response.json()) as RefreshTokenResponse;
      tokenStore.setTokens(data.access_token, data.refresh_token);
      return true;
    } catch {
      return false;
    }
  }

  function refreshSession(): Promise<boolean> {
    if (!refreshPromise) {
      refreshPromise = performRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    return refreshPromise;
  }

  function buildUrl(path: string): string {
    return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }

  function buildHeaders(init: RequestOptions): Headers {
    const headers = new Headers(init.headers);
    const auth = init.auth !== false;
    if (auth) {
      const token = tokenStore.getAccessToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }
    if (
      init.body !== undefined &&
      !(init.body instanceof FormData) &&
      !headers.has('Content-Type')
    ) {
      headers.set('Content-Type', 'application/json');
    }
    return headers;
  }

  function buildBody(body: unknown): BodyInit | undefined {
    if (body === undefined) return undefined;
    if (body instanceof FormData) return body;
    return JSON.stringify(body);
  }

  async function rawFetch(path: string, init: RequestOptions): Promise<Response> {
    return fetchImpl(buildUrl(path), {
      method: init.method ?? (init.body !== undefined ? 'POST' : 'GET'),
      headers: buildHeaders(init),
      body: buildBody(init.body),
      signal: init.signal,
    });
  }

  async function readErrorDetail(response: Response): Promise<unknown> {
    return response
      .clone()
      .json()
      .then((data: unknown) => (data as { detail?: unknown } | null)?.detail)
      .catch(() => undefined);
  }

  function errorMessage(detail: unknown, status: number): string {
    if (typeof detail === 'string' && detail) return detail;
    const mensagem = (detail as { mensagem?: unknown } | null | undefined)?.mensagem;
    if (typeof mensagem === 'string' && mensagem) return mensagem;
    return `Erro HTTP ${status}`;
  }

  async function fail(response: Response): Promise<never> {
    const detail = await readErrorDetail(response);
    throw new ApiError(errorMessage(detail, response.status), response.status, detail);
  }

  async function sendWithAuthRetry(path: string, init: RequestOptions): Promise<Response> {
    const auth = init.auth !== false;
    const response = await rawFetch(path, init);

    if (response.ok || response.status !== 401 || !auth || isAuthEndpoint(path)) {
      return response;
    }

    const refreshed = await refreshSession();
    if (!refreshed) {
      tokenStore.clear();
      notifySessionExpired();
      return response;
    }

    const retryResponse = await rawFetch(path, init);
    if (!retryResponse.ok && retryResponse.status === 401) {
      tokenStore.clear();
      notifySessionExpired();
    }
    return retryResponse;
  }

  async function request<T>(path: string, init: RequestOptions = {}): Promise<T> {
    const response = await sendWithAuthRetry(path, init);
    if (!response.ok) {
      return fail(response);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return response.json() as Promise<T>;
  }

  async function stream(path: string, init: RequestOptions = {}): Promise<Response> {
    const response = await sendWithAuthRetry(path, init);
    if (!response.ok) {
      return fail(response);
    }
    return response;
  }

  return { request, stream, onSessionExpired };
}
