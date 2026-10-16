import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeBooking, setActiveBooking] = useState(null);

  // Initialize tenant ID from persisted session
  const getInitialTenantId = () => {
    try {
      const stored = sessionStorage.getItem('tenant_user') || sessionStorage.getItem('pg_user') || localStorage.getItem('currentUser');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id && parsed.role === 'tenant') return String(parsed.id);
      }
    } catch (e) {
      // ignore
    }
    return null;
  };

  const [tenantId, setTenantId] = useState(getInitialTenantId);

  // Guard: Verify authentication on mount, bfcache restore, and history navigation
  useEffect(() => {
    const checkAuth = () => {
      try {
        const stored = sessionStorage.getItem('tenant_user') || sessionStorage.getItem('pg_user') || localStorage.getItem('currentUser');
        if (!stored) {
          window.location.replace('/login');
          return;
        }
        const parsed = JSON.parse(stored);
        if (!parsed || parsed.role !== 'tenant') {
          window.location.replace('/login');
          return;
        }
        if (String(parsed.id) !== tenantId) {
          setTenantId(String(parsed.id));
        }
      } catch {
        window.location.replace('/login');
      }
    };

    checkAuth();
    window.addEventListener('storage', checkAuth);
    window.addEventListener('pageshow', checkAuth);
    window.addEventListener('popstate', checkAuth);
    window.addEventListener('rentbro-logout', checkAuth);
    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('pageshow', checkAuth);
      window.removeEventListener('popstate', checkAuth);
      window.removeEventListener('rentbro-logout', checkAuth);
    };
  }, [tenantId]);

  const setTenantSession = (user) => {
    if (user && user.id) {
      setTenant(user);
      setTenantId(String(user.id));
      sessionStorage.setItem('tenant_user', JSON.stringify(user));
      sessionStorage.setItem('pg_user', JSON.stringify(user));
      localStorage.setItem('currentUser', JSON.stringify(user));
    }
  };

  const logout = () => {
    sessionStorage.removeItem('tenant_user');
    sessionStorage.removeItem('pg_user');
    sessionStorage.removeItem('guest_user');
    sessionStorage.removeItem('warden_user');
    sessionStorage.removeItem('owner_user');
    sessionStorage.removeItem('super_admin_token');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('pg_user');
    setTenant(null);
    setActiveBooking(null);
    try {
      window.dispatchEvent(new Event('rentbro-logout'));
    } catch (_) {}
    window.location.replace('/login');
  };

  useEffect(() => {
    const fetchTenantData = async () => {
      if (!tenantId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        // Fetch user profile from Neon
        const user = await apiFetch(`/users/${tenantId}`).catch(() => null);
        if (user) {
          setTenant(user);
        } else {
          // Fallback user profile
          setTenant({
            id: Number(tenantId),
            name: 'Arun Kumar',
            username: 'tenant1',
            email: 'tenant1@example.com',
            role: 'tenant',
          });
        }

        // Fetch bookings for this user to get active booking
        const bookings = await apiFetch(`/bookings?userId=${tenantId}`).catch(() => []);
        
        if (Array.isArray(bookings) && bookings.length > 0) {
          const userBookings = bookings.filter(b => b.tenantId === Number(tenantId) || b.tenant?.id === Number(tenantId));
          const active = userBookings.find(b => b.status === 'confirmed' || b.status === 'active') || userBookings[0];
          setActiveBooking(active);
        }
      } catch (error) {
        console.error('Failed to fetch tenant auth data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTenantData();
  }, [tenantId]);

  return (
    <AuthContext.Provider value={{ tenant, loading, activeBooking, setTenantSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
