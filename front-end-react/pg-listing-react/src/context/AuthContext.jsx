import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API_BASE = 'http://localhost:3000';

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem('guest_user') || sessionStorage.getItem('pg_user');
      return stored ? JSON.parse(stored) : null;
    } catch (_) {
      return null;
    }
  });

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalCallback, setAuthModalCallback] = useState(null);

  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('guest_user', JSON.stringify(currentUser));
      sessionStorage.setItem('pg_user', JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem('guest_user');
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

  const registerGuest = async ({ name, email, phone, password }) => {
    const res = await fetch(`${API_BASE}/users/guest-register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to register guest');
    }

    const userData = await res.json();
    setCurrentUser(userData);
    return userData;
  };

  const logout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('guest_user');
    sessionStorage.removeItem('pg_user');
  };

  const setSession = (user) => {
    setCurrentUser(user);
    sessionStorage.setItem('guest_user', JSON.stringify(user));
    sessionStorage.setItem('pg_user', JSON.stringify(user));
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
        registerGuest,
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
