import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeBooking, setActiveBooking] = useState(null);

  // Initialize tenant ID from persisted session or default to '1'
  const getInitialTenantId = () => {
    try {
      const stored = sessionStorage.getItem('tenant_user') || sessionStorage.getItem('pg_user') || localStorage.getItem('currentUser');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id) {
          const numId = Number(parsed.id);
          if (Number.isInteger(numId) && numId > 0 && numId <= 2147483647) {
            return String(numId);
          }
        }
      }
    } catch (e) {
      // ignore
    }
    return '1';
  };

  const [tenantId, setTenantId] = useState(getInitialTenantId);

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
    localStorage.removeItem('currentUser');
    setTenant(null);
    setActiveBooking(null);
  };

  useEffect(() => {
    const fetchTenantData = async () => {
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
