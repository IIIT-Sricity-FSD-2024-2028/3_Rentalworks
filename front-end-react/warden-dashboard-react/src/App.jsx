import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import WardenLayout from './components/WardenLayout';

import Dashboard from './pages/Dashboard';
import TenantRecords from './pages/TenantRecords';

import RoomServices from './pages/RoomServices';
import RuleViolations from './pages/RuleViolations';
import Complaints from './pages/Complaints';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';

import ErrorBoundary from './components/ErrorBoundary';

export function WardenPortal() {
  React.useEffect(() => {
    const checkAuth = () => {
      try {
        const u = JSON.parse(sessionStorage.getItem('warden_user')) || JSON.parse(sessionStorage.getItem('pg_user'));
        if (!u || u.role !== 'warden') {
          window.location.replace('/login');
        }
      } catch {
        window.location.replace('/login');
      }
    };
    checkAuth();
    window.addEventListener('pageshow', checkAuth);
    window.addEventListener('popstate', checkAuth);
    window.addEventListener('storage', checkAuth);
    return () => {
      window.removeEventListener('pageshow', checkAuth);
      window.removeEventListener('popstate', checkAuth);
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  return (
    <ErrorBoundary>
      <WardenLayout>
        <Routes>
          <Route path="/" element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="tenants" element={<TenantRecords />} />
          <Route path="rooms" element={<RoomServices />} />
          <Route path="violations" element={<RuleViolations />} />
          <Route path="complaints" element={<Complaints />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </WardenLayout>
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <WardenPortal />
    </BrowserRouter>
  )
}
