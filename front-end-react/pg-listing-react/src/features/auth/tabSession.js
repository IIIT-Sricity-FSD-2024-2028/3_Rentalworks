// Per-tab login. The signed-in user and their signed token live in this tab's
// sessionStorage, so every browser tab has its own login: signing in as a
// warden in one tab and as a tenant in another keeps both. A reload keeps the
// tab signed in; closing the tab ends that login. (The browser's "Duplicate
// tab" copies sessionStorage, so a duplicated tab starts with the same login.)

const KEY = 'rentbro.session';

const storage = () => {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null; // storage blocked (privacy mode): the login lasts until reload
  }
};

/** @returns {{ user: object, token: string } | null} */
export function readTabSession() {
  try {
    const raw = storage()?.getItem(KEY);
    const saved = raw ? JSON.parse(raw) : null;
    return saved?.user?.id && saved?.token ? { user: saved.user, token: saved.token } : null;
  } catch {
    return null;
  }
}

export function writeTabSession(user, token) {
  const s = storage();
  if (!s) return;
  try {
    if (user?.id && token) s.setItem(KEY, JSON.stringify({ user, token }));
    else s.removeItem(KEY);
  } catch {
    // quota / blocked: ignore, the in-memory session still works
  }
}

/** Mirror auth.user / auth.token into this tab's sessionStorage whenever they change. */
export function persistTabSession(store) {
  // Start from the current (signed-out) state, so the first actions after a
  // reload, e.g. restoreSession.pending, do not wipe the saved login before
  // restoreSession has read it. Only a real change of user/token is written.
  const initial = store.getState().auth || {};
  let last = { user: initial.user, token: initial.token };
  return store.subscribe(() => {
    const { user, token } = store.getState().auth || {};
    if (user === last.user && token === last.token) return;
    last = { user, token };
    writeTabSession(user, token);
  });
}
