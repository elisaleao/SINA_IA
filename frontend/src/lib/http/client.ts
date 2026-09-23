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
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export interface CreateApiClientOptions {
  baseUrl: string;
  tokenStore: TokenStore;
  fetchImpl?: typeof fetch;
}

export function createApiClient(options: CreateApiClientOptions): ApiClient {
  const { baseUrl, tokenStore } = options;
  const fetchImpl = options.fetchImpl ?? fetch;

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

  async function readErrorMessage(response: Response): Promise<string> {
    const detail = await response
      .clone()
      .json()
      .then((data: unknown) => (data as { detail?: string } | null)?.detail)
      .catch(() => undefined);
    return detail || `Erro HTTP ${response.status}`;
  }

  async function fail(response: Response): Promise<never> {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  async function request<T>(path: string, init: RequestOptions = {}): Promise<T> {
    const response = await rawFetch(path, init);
    if (!response.ok) {
      return fail(response);
    }
    return response.json() as Promise<T>;
  }

  return { request };
}
