import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { selectCurrentUser, ROLE_HOME } from '../features/auth/authSlice';

/**
 * Route guard driven by the Redux auth slice.
 *  - not signed in      → /login (remembers where the user was going)
 *  - signed in, wrong role → the user's own portal (not a login loop)
 * Logout anywhere clears the store, which re-renders this guard immediately.
 */
export default function RoleProtectedRoute({ role, allowedRoles, children }) {
  const location = useLocation();
  const user = useSelector(selectCurrentUser);
  const roles = allowedRoles || (role ? [role] : []);

  if (!user?.id) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (roles.length && !roles.includes(user.role)) {
    return <Navigate to={ROLE_HOME[user.role] || '/'} replace />;
  }
  return children;
}
