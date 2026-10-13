import { useEffect, useState } from 'react';
import { api } from './services/api';
import { mergeById, readList } from './services/data';
import Shell from './components/Shell';
import Dashboard from './pages/Dashboard';
import RegionalAdmins from './pages/RegionalAdmins';
import GlobalReports from './pages/GlobalReports';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Login from './pages/Login';

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('pg_user') || 'null'); }
    catch { return null; }
  });
  const [section, setSection] = useState('dashboard');
  const [data, setData] = useState({ users: [], properties: [], payments: [], notifications: [] });
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  function showToast(type, title, message) { setToast({ type, title, message, id: Date.now() }); }

  async function refresh() {
    const endpoints = [api.users, api.properties, api.payments, api.notifications];
    const results = await Promise.allSettled(endpoints.map(load => load()));
    const keys = ['users', 'properties', 'payments', 'notifications'];
    const localKeys = ['admin_users', 'admin_properties', 'global_payments', 'admin_notifs'];
    const next = {};
    results.forEach((result, index) => {
      const server = result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : [];
      next[keys[index]] = mergeById(server, readList(localKeys[index]));
    });
    next.users = mergeById(next.users, [...readList('registered_guests'), ...readList('registered_owners')]);
    next.notifications = mergeById(next.notifications, readList('cross_notifications'));
    setData(next);
    setError(results.some(result => result.status === 'rejected') ? 'Some data could not be loaded from the server.' : '');
  }

  useEffect(() => { if (user?.role === 'super_admin') refresh(); }, [user?.role]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  if (user?.role !== 'super_admin') return <Login onLogin={setUser} />;

  const pages = {
    dashboard: <Dashboard data={data} />,
    regional_admins: <RegionalAdmins users={data.users} refresh={refresh} showToast={showToast} />,
    global_reports: <GlobalReports data={data} />,
    notifications: <Notifications data={data} refresh={refresh} showToast={showToast} />,
    profile: <Profile user={user} setUser={setUser} users={data.users} refresh={refresh} showToast={showToast} />,
  };

  return <Shell user={user} section={section} setSection={setSection} onLogout={() => setUser(null)} toast={toast}>
    {error && <p role="alert" style={{ color: '#d97706' }}>{error}</p>}
    {pages[section]}
  </Shell>;
}
