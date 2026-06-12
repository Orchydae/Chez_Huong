/*
 * The single seam between the client and the server.
 *
 * THE RULE (see docs/diagrams/client_component_diagram.puml): only the api/
 * folder talks to the server, and every *.api.ts call goes through this file.
 * It owns the base URL + /v1 prefix, attaches the login token, normalizes
 * errors, and turns a 401 into an app-wide "logged out" signal.
 */

const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const API_ROOT = `${BASE_URL}/v1`;

/** localStorage key — exported so auth.api.ts can watch cross-tab changes. */
export const TOKEN_KEY = 'access_token';

/** Fired on window whenever the server answers 401 (expired/invalid login). */
export const UNAUTHORIZED_EVENT = 'auth:unauthorized';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** Normalized server error: status + a single human-readable message. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** JSON-serialized into the body. Mutually exclusive with formData. */
  body?: unknown;
  /** Sent as multipart/form-data (file uploads). */
  formData?: FormData;
  query?: Record<string, string | number | undefined>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, formData, query } = options;

  const url = new URL(`${API_ROOT}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError(0, 'network');
  }

  if (res.status === 401) {
    clearToken();
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }

  if (!res.ok) {
    throw new ApiError(res.status, await extractMessage(res));
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** NestJS errors carry { message: string | string[] }; collapse to one string. */
async function extractMessage(res: Response): Promise<string> {
  try {
    const data: unknown = await res.json();
    if (data && typeof data === 'object' && 'message' in data) {
      const message = (data as { message: string | string[] }).message;
      return Array.isArray(message) ? message.join(' · ') : message;
    }
  } catch {
    /* non-JSON body — fall through */
  }
  return `HTTP ${res.status}`;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query']) => request<T>(path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  postForm: <T>(path: string, formData: FormData) => request<T>(path, { method: 'POST', formData }),
};
