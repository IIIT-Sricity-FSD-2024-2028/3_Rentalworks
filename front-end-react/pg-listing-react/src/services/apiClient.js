// ===================================================================
//  Central HTTP client for the whole SPA.
//  Every dashboard / feature goes through this one function so that
//  base URL, auth headers and error handling live in a single place.
// ===================================================================

const localApiHost = typeof window !== 'undefined' && window.location.hostname === '127.0.0.1'
  ? '127.0.0.1'
  : 'localhost';
export const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${localApiHost}:3000`;
// Session-scoped routes are called with this tab's Bearer token (not the shared
// cookie), so each tab acts as its own signed-in user.
export const browserSessionOptions = { auth: true };

// The Redux store is injected at startup (see app/store.js) so the client can
// read the signed-in user without a circular import.
let storeRef = null;
export const injectStore = (store) => {
  storeRef = store;
};

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function authHeaders() {
  const auth = storeRef?.getState()?.auth;
  const headers = {};
  if (auth?.user?.id) {
    headers['x-user-id'] = String(auth.user.id);
    headers['x-role'] = auth.user.role;
  }
  if (auth?.token) headers.Authorization = `Bearer ${auth.token}`;
  return headers;
}

function extractMessage(data, status) {
  if (data && typeof data === 'object') {
    const msg = data.message || data.error;
    if (Array.isArray(msg)) return msg.join(', ');
    if (msg) return String(msg);
  }
  if (typeof data === 'string' && data) return data;
  if (status === 0) return 'Cannot reach the server. Please check that the backend is running.';
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'You do not have permission to perform this action.';
  if (status === 404) return 'The requested resource was not found.';
  return `Request failed (${status})`;
}

/**
 * @param {string} path      e.g. '/bookings?tenantId=4'
 * @param {object} options   { method, body, headers, auth = true }
 *   body may be a plain object (sent as JSON) or FormData (sent as multipart).
 */
export async function apiRequest(path, { method = 'GET', body, headers = {}, auth = true, credentials, responseType } = {}) {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const finalHeaders = {
    ...(isForm || body === undefined ? {} : { 'Content-Type': 'application/json' }),
    ...(auth ? authHeaders() : {}),
    ...headers,
  };

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: finalHeaders,
      credentials,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(extractMessage(null, 0), 0, null);
  }

  if (response.status === 204) return null;
  if (response.ok && responseType === 'blob') return response.blob();

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const sentAuthorization = finalHeaders.Authorization;
    if (response.status === 401 && auth && sentAuthorization && sentAuthorization === authHeaders().Authorization) {
      // A response from an earlier sign-in must not expire the current session.
      storeRef.dispatch({ type: 'auth/sessionExpired' });
    }
    throw new ApiError(extractMessage(data, response.status), response.status, data);
  }
  return data;
}

export const http = {
  get: (path, opts) => apiRequest(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => apiRequest(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => apiRequest(path, { ...opts, method: 'PUT', body }),
  patch: (path, body, opts) => apiRequest(path, { ...opts, method: 'PATCH', body }),
  delete: (path, opts) => apiRequest(path, { ...opts, method: 'DELETE' }),
};

/** Build a query string, skipping empty values. */
export function qs(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

/** Normalise any list-ish API payload into an array. */
export function asArray(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

/**
 * Open a login-protected file (e.g. a property document) in a new tab.
 * A plain <a href> cannot send the session token, so the file is fetched
 * with it and shown from a temporary blob URL.
 */
export async function openProtectedFile(path) {
  // Open the tab first (inside the click) so popup blockers allow it.
  const tab = window.open('', '_blank');
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { headers: authHeaders() });
    if (!response.ok) {
      let data = null;
      try {
        data = await response.json();
      } catch {
        // not JSON
      }
      throw new ApiError(extractMessage(data, response.status), response.status, data);
    }
    const url = URL.createObjectURL(await response.blob());
    if (tab) tab.location.href = url;
    else window.location.assign(url);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    if (tab) tab.close();
    throw err;
  }
}
