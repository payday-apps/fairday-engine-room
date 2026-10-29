import axios from 'axios';
import { isAdminApiHost } from './prodAdminApi';

const STAGING_ADMIN_TOKEN_URL = 'https://staging-api.fairday.app/internal/admin-token';

// Claims engines stay on the staging API. This client does not mint tokens.
export const api = axios.create({
  baseURL: 'https://staging-api.fairday.app/api/admin/claims',
  withCredentials: true,
});

/**
 * App gate.
 *
 * On `api.fairday.app` or `staging-api.fairday.app`, POST same-origin
 * `/internal/admin-token`. An absolute cross-origin admin-token URL does not
 * authenticate this app: `/internal` has no CORS. On Firebase and any other
 * host, keep the staging-api mint so the claims engines can still open.
 * Contact Submissions does not use that cross-origin call.
 */
export const authenticateAdmin = async () => {
  try {
    const url = isAdminApiHost() ? '/internal/admin-token' : STAGING_ADMIN_TOKEN_URL;
    const res = await axios.post(url, {}, {
      withCredentials: true,
    });
    return res.status === 200;
  } catch {
    return false;
  }
};