import axios from 'axios';

const BEARER_STORAGE_KEY = 'fairday_admin_bearer';

/** In-tab fallback when sessionStorage is unavailable. */
let memoryBearer: string | null = null;

/**
 * Production admin client for routes that require `Authorization: Bearer`
 * (`adminOnly`). The staging claims client in `api.ts` is a different host
 * and only sends cookies.
 */
export const prodAdminApi = axios.create({
  baseURL: 'https://api.fairday.app',
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

prodAdminApi.interceptors.request.use((config) => {
  const token = readBearer();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

/**
 * Mint a production admin Bearer before contact-submission calls.
 *
 * Same shape as `authenticateAdmin`, on the production host:
 * `POST https://api.fairday.app/internal/admin-token` with credentials.
 * Stores `res.data.token` when the JSON body includes it.
 *
 * The current backend sets an httpOnly cookie and returns `{ message, expiresIn }`
 * with no `token` field. `adminOnly` ignores that cookie, and the staging `adrt`
 * cookie is path-scoped to `/api/admin/claims`, so it is not sent to
 * `/api/admins/…`. List and status stay 401 until fairday-backend returns
 * `{ token }` from this route, or contact routes accept `adminOrInternalAuth`
 * with a cookie path the browser will send.
 *
 * Returns true when a Bearer is stored.
 */
export async function ensureProdAdminBearer(): Promise<boolean> {
  if (readBearer()) return true;

  const res = await axios.post<{ token?: unknown }>(
    'https://api.fairday.app/internal/admin-token',
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
