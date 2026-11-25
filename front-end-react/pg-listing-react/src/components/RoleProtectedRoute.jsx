import React from 'react';
import ProtectedRoute from './ProtectedRoute';

/**
 * RoleProtectedRoute enforces role-based access for specific dashboard routes.
 * Wraps ProtectedRoute with explicit role-checking semantics.
 */
export default function RoleProtectedRoute({ role, allowedRoles, children }) {
  const roles = allowedRoles || (role ? [role] : []);
  return <ProtectedRoute allowedRoles={roles}>{children}</ProtectedRoute>;
}
