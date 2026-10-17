import React, { createContext, useContext, useState, useEffect } from 'react';
import { clearAuthSession } from '../utils/auth';

const AuthContext = createContext(null);

const API_BASE = 'http://localhost:3000';

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem('pg_user') || sessionStorage.getItem('guest_user');
      return stored ? JSON.parse(stored) : null;
    } catch (_) {
      return null;
    }
  });

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalCallback, setAuthModalCallback] = useState(null);

  // Sync state with storage on bfcache restore, history back/forward, and login/logout events
  useEffect(() => {
    const syncUser = () => {
      try {
        const stored = sessionStorage.getItem('pg_user') || sessionStorage.getItem('guest_user');
        if (!stored) {
          setCurrentUser(null);
        } else {
          setCurrentUser(JSON.parse(stored));
        }
      } catch (_) {
        setCurrentUser(null);
      }
    };

    const handleLoginEvent = (e) => {
      if (e?.detail) {
        setCurrentUser(e.detail);
      } else {
        syncUser();
      }
    };

    window.addEventListener('storage', syncUser);
    window.addEventListener('pageshow', syncUser);
    window.addEventListener('popstate', syncUser);
    window.addEventListener('rentbro-logout', syncUser);
    window.addEventListener('rentbro-login', handleLoginEvent);

    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('pageshow', syncUser);
      window.removeEventListener('popstate', syncUser);
      window.removeEventListener('rentbro-logout', syncUser);
      window.removeEventListener('rentbro-login', handleLoginEvent);
    };
  }, []);

  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('guest_user', JSON.stringify(currentUser));
      sessionStorage.setItem('pg_user', JSON.stringify(currentUser));
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      clearAuthSession();
    }
  }, [currentUser]);

  const login = async (username, password) => {
    const res = await fetch(`${API_BASE}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Invalid username or password');
    }

    const userData = await res.json();
    setCurrentUser(userData);
    return userData;
  };

  const guestLogin = async (username, password) => {
    const res = await fetch(`${API_BASE}/users/guest-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Invalid username or password');
    }

    const userData = await res.json();
    setCurrentUser(userData);
    return userData;
  };

  const registerGuest = async ({ name, email, phone, password, gender }) => {
    const res = await fetch(`${API_BASE}/users/guest-register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, password, gender }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to register guest');
    }

    const userData = await res.json();
    setCurrentUser(userData);
    return userData;
  };

  const updateUserGender = async (gender) => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch(`${API_BASE}/users/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-role': currentUser.role || 'tenant', 'x-user-id': String(currentUser.id), ...(currentUser.token ? { Authorization: `Bearer ${currentUser.token}` } : {}) },
        body: JSON.stringify({ gender }),
      });
      if (res.ok) {
        const updated = await res.json();
        const merged = { ...currentUser, ...updated, gender };
        setCurrentUser(merged);
        sessionStorage.setItem('guest_user', JSON.stringify(merged));
        sessionStorage.setItem('pg_user', JSON.stringify(merged));
        localStorage.setItem('currentUser', JSON.stringify(merged));
        return merged;
      }
    } catch (err) {
      console.warn('Could not update user gender on backend:', err);
    }
    const fallback = { ...currentUser, gender };
    setCurrentUser(fallback);
    return fallback;
  };

  const logout = () => {
    setCurrentUser(null);
    clearAuthSession();
    try {
      window.dispatchEvent(new Event('rentbro-logout'));
    } catch (_) {}
  };

  const setSession = (user) => {
    setCurrentUser(user);
    if (user) {
      sessionStorage.setItem('guest_user', JSON.stringify(user));
      sessionStorage.setItem('pg_user', JSON.stringify(user));
      localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
      clearAuthSession();
    }
  };

  // Gatekeeper: ensure user is logged in before proceeding with booking
  const requireAuth = (callback) => {
    if (currentUser) {
      if (typeof callback === 'function') callback(currentUser);
      return true;
    }
    setAuthModalCallback(() => callback);
    setAuthModalOpen(true);
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        guestLogin,
        registerGuest,
        updateUserGender,
        logout,
        setSession,
        requireAuth,
        authModalOpen,
        setAuthModalOpen,
        authModalCallback,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
