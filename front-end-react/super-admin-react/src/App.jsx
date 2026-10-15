import { useEffect, useState } from 'react';
import { api } from './services/api';
import Shell from './components/Shell';
import Dashboard from './pages/Dashboard';
import RegionalAdmins from './pages/RegionalAdmins';
import GlobalReports from './pages/GlobalReports';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Login from './pages/Login';

export function SuperAdminPortal() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('pg_user') || 'null'); }
    catch { return null; }
  });
  const [section, setSection] = useState('dashboard');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const signedIn = user && user.role === 'super_admin' && (sessionStorage.getItem('super_admin_token') || sessionStorage.getItem('pg_user'));

  function showToast(type, title, message) { setToast({ type, title, message, id: Date.now() }); }

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

  useEffect(() => { if (signedIn) refresh(); }, [Boolean(signedIn)]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!signedIn) return <Login onLogin={setUser} />;

  const pages = data ? {
    dashboard: <Dashboard data={data} />,
    regional_admins: <RegionalAdmins users={data.users} refresh={refresh} showToast={showToast} />,
    global_reports: <GlobalReports data={data} />,
    notifications: <Notifications data={data} refresh={refresh} showToast={showToast} />,
    profile: <Profile user={user} setUser={setUser} showToast={showToast} />,
  } : {};

  return <Shell user={user} section={section} setSection={setSection} onLogout={() => { setUser(null); setData(null); }} toast={toast}>
    {error && <p role="alert" style={{ color: '#d97706' }}>{error} <button onClick={refresh}>Retry</button></p>}
    {data ? pages[section] : !error && <p>Loading live data...</p>}
  </Shell>;
}

export default function App() {
  return <SuperAdminPortal />;
}

