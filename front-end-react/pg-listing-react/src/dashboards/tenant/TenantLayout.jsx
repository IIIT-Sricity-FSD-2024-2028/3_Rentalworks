import React from 'react';
import Layout from './components/Layout';
import { AuthProvider as TenantAuthProvider } from './context/AuthContext';
import './index.css';

export default function TenantLayout({ children }) {
  return (
    <div className="portal-tenant-scope">
      <TenantAuthProvider>
        {children || <Layout />}
      </TenantAuthProvider>
    </div>
  );
}
