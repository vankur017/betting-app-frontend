import { env } from '../config/env';

const IDEMPOTENCY_HEADER_NAME = 'Idempotency-Key';

/** True when the API runs on this computer (localhost, *.localhost, 127.x.x.x or [::1]). */
export function isLoopbackUrl(url: string): boolean {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  return (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    /^127(\.\d{1,3}){3}$/.test(hostname) ||
    hostname === '[::1]'
  );
}

// A deployed (https) page calling an http API on this computer, e.g. the Vercel site with the
// backend on localhost. Chrome asks the player for local network access before allowing it.
const LOOPBACK_API = isLoopbackUrl(env.apiBaseUrl);
const CALLS_LOCAL_FROM_SITE =
  LOOPBACK_API &&
  typeof window !== 'undefined' &&
  !isLoopbackUrl(window.location.href);

/** Raised for every failed API call. `status` is 0 when the server could not be reached. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly details: unknown;
  readonly fieldErrors: Record<string, string>;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: unknown,
    fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.fieldErrors = fieldErrors;
  }
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
export type QueryParams = Record<string, string | number | boolean | undefined>;

export interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  query?: QueryParams;
  /** Send for any request that can debit, credit, or settle a wallet. */
  idempotencyKey?: string;
  signal?: AbortSignal;
}

const FALLBACK_MESSAGES: Record<number, string> = {
  400: 'The request was not valid.',
  404: 'We could not find what you were looking for.',
  409: 'That action conflicts with the current state. Refresh and try again.',
  413: 'The request was too large.',
  422: 'That action is not allowed right now.',
  429: 'Too many attempts. Please wait a moment and try again.',
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function buildUrl(path: string, query?: QueryParams): string {
  const url = `${env.apiBaseUrl}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function fallbackMessage(status: number): string {
  if (status >= 500) return 'Something went wrong on our side. Please try again.';
  return FALLBACK_MESSAGES[status] ?? 'The request could not be completed.';
}

/** Reads the API error envelope: { success: false, error: { code, message, details? } }. */
function toApiError(status: number, payload: unknown): ApiError {
  const error = isObject(payload) && isObject(payload.error) ? payload.error : undefined;
  const code = typeof error?.code === 'string' ? error.code : undefined;
  const serverMessage =
    typeof error?.message === 'string' && error.message ? error.message : undefined;

  // Never surface server-error text: it may describe internals.
  if (status >= 500) return new ApiError(fallbackMessage(status), status, code);

  const message = serverMessage ?? fallbackMessage(status);
  const details = error?.details;
  const fieldErrors: Record<string, string> = {};
  if (isObject(details) && typeof details.field === 'string') fieldErrors[details.field] = message;
  return new ApiError(message, status, code, details, fieldErrors);
}

/** Calls the API and returns the unwrapped `data` from { success: true, data }. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const headers = new Headers({ Accept: 'application/json' });
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  if (options.idempotencyKey) headers.set(IDEMPOTENCY_HEADER_NAME, options.idempotencyKey);

  let response: Response;
  try {
    const init: RequestInit & { targetAddressSpace?: 'loopback' } = {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    };
    // Tells Chrome before the request is sent that it goes to this computer, so the https page
    // is allowed to call http://localhost once the player grants access. Other browsers ignore it.
    if (LOOPBACK_API) init.targetAddressSpace = 'loopback';
    response = await fetch(buildUrl(path, options.query), init);
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError(
      CALLS_LOCAL_FROM_SITE
        ? 'Cannot reach the game server on this computer. Check that the backend is running, and that this site is allowed local network access (site settings, next to the address bar).'
        : 'Cannot reach the server. Check that the backend is running and try again.',
      0,
      'NETWORK_ERROR',
    );
  }

  if (response.status === 204) return undefined as T;

  const payload = await readBody(response);
  if (!response.ok) throw toApiError(response.status, payload);
  if (isObject(payload) && payload.success === true && 'data' in payload) {
    return payload.data as T;
  }
  throw new ApiError(
    'The server sent an unexpected response.',
    response.status,
    'UNEXPECTED_RESPONSE',
  );
}
