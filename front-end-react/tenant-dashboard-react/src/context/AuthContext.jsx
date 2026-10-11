import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeBooking, setActiveBooking] = useState(null);

  // Hardcode tenantId = 1 for now, as per instruction to skip login page.
  const tenantId = '1';

  useEffect(() => {
    const fetchTenantData = async () => {
      try {
        setLoading(true);
        // Fetch user profile
        const user = await apiFetch(`/users/${tenantId}`);
        setTenant(user);

        // Fetch bookings for this user to get active booking
        const bookings = await apiFetch(`/bookings?userId=${tenantId}`);
        
        // Find the active or upcoming booking
        if (Array.isArray(bookings) && bookings.length > 0) {
          const userBookings = bookings.filter(b => b.tenantId === Number(tenantId) || b.tenant?.id === Number(tenantId));
          const active = userBookings.find(b => b.status === 'active') || userBookings[0];
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
    <AuthContext.Provider value={{ tenant, loading, activeBooking }}>
      {children}
    </AuthContext.Provider>
  );
};
