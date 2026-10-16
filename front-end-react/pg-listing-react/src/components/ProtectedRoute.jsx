import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getStoredUser } from '../utils/auth';

export default function ProtectedRoute({ allowedRoles, children }) {
  const location = useLocation();
  const [user, setUser] = useState(() => getStoredUser());

  useEffect(() => {
    const verifyUser = () => {
      const activeUser = getStoredUser();
      setUser(activeUser);
      if (!activeUser || (allowedRoles && !allowedRoles.includes(activeUser.role))) {
        // Enforce immediate redirect on browser back or session removal
        window.location.replace('/login');
      }
    };

    window.addEventListener('storage', verifyUser);
    window.addEventListener('pageshow', verifyUser);
    window.addEventListener('popstate', verifyUser);
    window.addEventListener('rentbro-logout', verifyUser);

    return () => {
      window.removeEventListener('storage', verifyUser);
      window.removeEventListener('pageshow', verifyUser);
      window.removeEventListener('popstate', verifyUser);
      window.removeEventListener('rentbro-logout', verifyUser);
    };
  }, [allowedRoles]);

  if (!user || !user.role) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
