import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@tenant/components/Layout';
import Dashboard from '@tenant/pages/Dashboard';
import Issues from '@tenant/pages/Issues';
import Notifications from '@tenant/pages/Notifications';
import Complaints from '@tenant/pages/Complaints';
import Services from '@tenant/pages/Services';
import Payments from '@tenant/pages/Payments';
import Profile from '@tenant/pages/Profile';
import { AuthProvider as TenantAuthProvider } from '@tenant/context/AuthContext';
import '@tenant/index.css';

export default function TenantPortal() {
  return (
    <div className="portal-tenant-scope">
      <TenantAuthProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="issues" element={<Issues />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="complaints" element={<Complaints />} />
            <Route path="services" element={<Services />} />
            <Route path="payments" element={<Payments />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </TenantAuthProvider>
    </div>
  );
}
