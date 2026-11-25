import React, { useEffect, useState, createContext, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import { api } from './services/api';
import Shell from './components/Shell';
import Dashboard from './pages/Dashboard';
import RegionalAdmins from './pages/RegionalAdmins';
import GlobalReports from './pages/GlobalReports';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import './styles_admin.css';
import './morphism-effects.css';

export const SuperAdminContext = createContext(null);
export function useSuperAdmin() {
  const ctx = useContext(SuperAdminContext);
  if (!ctx) throw new Error('useSuperAdmin must be used within SuperAdminLayout');
  return ctx;
}

export default function SuperAdminLayout() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('pg_user') || 'null'); }
    catch { return null; }
  });
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const signedIn = user && user.role === 'super_admin' && (sessionStorage.getItem('super_admin_token') || sessionStorage.getItem('pg_user'));

  function showToast(type, title, message) {
    setToast({ type, title, message, id: Date.now() });
  }

  async function refresh() {
    try {
      const next = await api.overview();
      setData(next);
      setError('');
    } catch (failure) {
      setData(null);
      setError(failure.message);
      if (failure.message === 'Sign in as super admin' || failure.message === 'Session expired' || failure.message === 'Invalid session') {
        sessionStorage.removeItem('super_admin_token');
        setUser(null);
      }
    }
  }

  useEffect(() => {
    if (signedIn) refresh();
  }, [Boolean(signedIn)]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!signedIn) {
    window.location.replace('/login');
    return null;
  }

  const contextValue = {
    data,
    user,
    setUser,
    refresh,
    showToast,
  };

  return (
    <SuperAdminContext.Provider value={contextValue}>
      <div className="portal-super-admin-scope">
        <Shell user={user} onLogout={() => { setUser(null); setData(null); }} toast={toast}>
          {error && (
            <p role="alert" style={{ color: '#d97706', padding: '16px' }}>
              {error} <button onClick={refresh}>Retry</button>
            </p>
          )}
          {!data && !error ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
              <p>Connecting to database &amp; loading executive metrics...</p>
            </div>
          ) : (
            <Outlet />
          )}
        </Shell>
      </div>
    </SuperAdminContext.Provider>
  );
}

// Connected page route components that consume SuperAdminContext
export function SuperAdminDashboardRoute() {
  const { data } = useSuperAdmin();
  return data ? <Dashboard data={data} /> : null;
}

export function SuperAdminRegionalAdminsRoute() {
  const { data, refresh, showToast } = useSuperAdmin();
  return data ? <RegionalAdmins users={data.users || []} refresh={refresh} showToast={showToast} /> : null;
}

export function SuperAdminGlobalReportsRoute() {
  const { data } = useSuperAdmin();
  return data ? <GlobalReports data={data} /> : null;
}

export function SuperAdminNotificationsRoute() {
  const { data, refresh, showToast } = useSuperAdmin();
  return data ? <Notifications data={data} refresh={refresh} showToast={showToast} /> : null;
}

export function SuperAdminProfileRoute() {
  const { user, setUser, showToast } = useSuperAdmin();
  return <Profile user={user} setUser={setUser} showToast={showToast} />;
}
