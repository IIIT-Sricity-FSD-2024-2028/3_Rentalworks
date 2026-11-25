// Persists the signed-in session in one place (instead of the 8 different
// storage keys the app used before). localStorage is used so the session
// survives refreshes and new tabs; a `storage` event keeps tabs in sync.

export const SESSION_KEY = 'rentbro_session';

const LEGACY_KEYS = [
  'pg_user', 'guest_user', 'tenant_user', 'warden_user', 'owner_user',
  'super_admin_token', 'admin_token', 'currentUser', 'pg_manager_data_storage',
];

export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return { user: null, token: null };
    const parsed = JSON.parse(raw);
    if (!parsed?.user?.id || !parsed?.user?.role) return { user: null, token: null };
    return { user: parsed.user, token: parsed.token || null };
  } catch {
    return { user: null, token: null };
  }
}

export function saveSession(user, token) {
  try {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify({ user, token: token || null }));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // storage unavailable (private mode) — session stays in memory only
  }
}

/** Remove keys written by the pre-Redux version of the app. */
export function clearLegacySessionKeys() {
  try {
    LEGACY_KEYS.forEach((k) => {
      sessionStorage.removeItem(k);
      localStorage.removeItem(k);
    });
  } catch {
    // ignore
  }
}
