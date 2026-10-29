import axios from 'axios';

const BEARER_STORAGE_KEY = 'fairday_admin_bearer';

/**
 * Hosts that serve this SPA next to `/internal` and `/api`.
 * Mint and contact calls stay on that origin. An absolute
 * `https://api.fairday.app` URL does not fix auth: `/internal` has no CORS
 * (OPTIONS is 401 and sends no Access-Control-Allow-Origin).
 */
const ADMIN_API_HOSTS = new Set(['api.fairday.app', 'staging-api.fairday.app']);

export const CONTACT_SUBMISSIONS_PROD_URL = 'https://api.fairday.app/engine-room/';

export const CONTACT_SUBMISSIONS_HOST_MESSAGE =
  `Contact Submissions must be opened at ${CONTACT_SUBMISSIONS_PROD_URL} (prod) once that host serves this app.`;

/** Thrown instead of a cross-origin mint or list call. */
export class AdminApiHostError extends Error {
  constructor() {
    super(CONTACT_SUBMISSIONS_HOST_MESSAGE);
    this.name = 'AdminApiHostError';
  }
}

/** In-tab fallback when sessionStorage is unavailable. */
let memoryBearer: string | null = null;

function currentHostname(): string {
  if (typeof window === 'undefined') return '';
  return window.location.hostname;
}

export function isAdminApiHost(hostname: string = currentHostname()): boolean {
  return ADMIN_API_HOSTS.has(hostname.toLowerCase());
}

/** Page origin when this document is served from an admin API host. */
function sameOriginAdminBase(): string | null {
  if (typeof window === 'undefined' || !isAdminApiHost()) return null;
  return window.location.origin;
}

/**
 * Admin client for contact routes that require `Authorization: Bearer`
 * (`adminOnly`). `baseURL` is set per request to this page's origin, and only
 * on `api.fairday.app` or `staging-api.fairday.app`.
 *
 * Paths are host-root relative (`/api/admins/contact-submissions…`), not under
 * `/engine-room`. The claims client in `api.ts` is separate.
 */
export const prodAdminApi = axios.create({
  withCredentials: true,
});

function readBearer(): string | null {
  if (memoryBearer) return memoryBearer;
  try {
    const stored = sessionStorage.getItem(BEARER_STORAGE_KEY);
    if (stored) memoryBearer = stored;
  } catch {
    // sessionStorage can throw; the module variable still holds a token for this document.
  }
  return memoryBearer;
}

function storeBearer(token: string): void {
  memoryBearer = token;
  try {
    sessionStorage.setItem(BEARER_STORAGE_KEY, token);
  } catch {
    // Module variable is enough for this document.
  }
}

export function clearProdAdminBearer(): void {
  memoryBearer = null;
  try {
    sessionStorage.removeItem(BEARER_STORAGE_KEY);
  } catch {
    // Module variable is already cleared.
  }
}

prodAdminApi.interceptors.request.use((config) => {
  const baseURL = sameOriginAdminBase();
  if (!baseURL) {
    throw new AdminApiHostError();
  }
  config.baseURL = baseURL;
  const token = readBearer();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

/**
 * Mint an admin Bearer on the current admin API origin.
 *
 * POST relative `/internal/admin-token` with credentials so the browser does
 * not make a cross-origin call. Stores `res.data.token` when that field is a
 * non-empty string. A 200 without `token` still returns false; same-origin
 * cookies remain on later calls via `withCredentials`.
 *
 * Throws `AdminApiHostError` on any other host. Does not call
 * `https://api.fairday.app`.
 *
 * Returns true when a Bearer is stored.
 */
export async function ensureProdAdminBearer(): Promise<boolean> {
  if (!isAdminApiHost()) {
    throw new AdminApiHostError();
  }

  if (readBearer()) return true;

  const res = await axios.post<{ token?: unknown }>(
    '/internal/admin-token',
    {},
    { withCredentials: true },
  );

  const token = res.data?.token;
  if (typeof token === 'string' && token.length > 0) {
    storeBearer(token);
    return true;
  }

  return false;
}

function isUnauthorized(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

/**
 * Run one admin call. On 401, drop the stored Bearer, mint again, and retry
 * that call once.
 */
export async function withProdAdminAuth<T>(run: () => Promise<T>): Promise<T> {
  await ensureProdAdminBearer();
  try {
    return await run();
  } catch (error) {
    if (!isUnauthorized(error)) throw error;
    clearProdAdminBearer();
    await ensureProdAdminBearer();
    return await run();
  }
}

export function prodAdminErrorMessage(error: unknown): string {
  if (error instanceof AdminApiHostError) return error.message;
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401) return 'The admin session was rejected (401).';
    if (status) return `The request failed (HTTP ${status}).`;
    return 'The request failed.';
  }
  if (error instanceof Error && error.message) return error.message;
  return 'The request failed.';
}
