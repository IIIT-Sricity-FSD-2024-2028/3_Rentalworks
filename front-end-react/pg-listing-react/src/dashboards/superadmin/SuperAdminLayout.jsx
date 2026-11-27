import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Shell from './components/Shell';
import Dashboard from './pages/Dashboard';
import RegionalAdmins from './pages/RegionalAdmins';
import GlobalReports from './pages/GlobalReports';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import { fetchSuperAdminOverview, selectSuperAdmin, selectSuperAdminOverview } from '../../features/superadmin/superAdminSlice';
import { selectCurrentUser } from '../../features/auth/authSlice';
import { useSignOut } from '../../app/hooks';
import { showToast } from '../../features/ui/uiSlice';
import './styles_admin.css';
import './morphism-effects.css';

/** Pages keep their `showToast(type, title, message)` signature; it now dispatches to the global toast slice. */
export function useSuperAdminToast() {
  const dispatch = useDispatch();
  return (type, title, message) => dispatch(showToast({ type, message: title ? `${title}: ${message}` : message }));
}

function useRefresh() {
  const dispatch = useDispatch();
  return () => dispatch(fetchSuperAdminOverview()).unwrap();
}

export default function SuperAdminLayout() {
  const dispatch = useDispatch();
  const handleLogout = useSignOut();
  const user = useSelector(selectCurrentUser);
  const { overview, status, error } = useSelector(selectSuperAdmin);

  useEffect(() => {
    dispatch(fetchSuperAdminOverview());
  }, [dispatch]);

  return (
    <div className="portal-super-admin-scope">
      <Shell user={user} onLogout={handleLogout}>
        {error && (
          <p role="alert" style={{ color: '#d97706', padding: '16px' }}>
            {error} <button onClick={() => dispatch(fetchSuperAdminOverview())}>Retry</button>
          </p>
        )}
        {!overview && status !== 'failed' ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
            <p>Connecting to database &amp; loading executive metrics...</p>
          </div>
        ) : overview ? (
          <Outlet />
        ) : null}
      </Shell>
    </div>
  );
}

// Route components: read the overview from Redux and hand it to the pages.
export function SuperAdminDashboardRoute() {
  const overview = useSelector(selectSuperAdminOverview);
  return overview ? <Dashboard data={overview} /> : null;
}

export function SuperAdminRegionalAdminsRoute() {
  const overview = useSelector(selectSuperAdminOverview);
  const refresh = useRefresh();
  const toast = useSuperAdminToast();
  return overview ? <RegionalAdmins users={overview.users || []} refresh={refresh} showToast={toast} /> : null;
}

export function SuperAdminGlobalReportsRoute() {
  const overview = useSelector(selectSuperAdminOverview);
  return overview ? <GlobalReports data={overview} /> : null;
}

export function SuperAdminNotificationsRoute() {
  const overview = useSelector(selectSuperAdminOverview);
  const refresh = useRefresh();
  const toast = useSuperAdminToast();
  return overview ? <Notifications data={overview} refresh={refresh} showToast={toast} /> : null;
}

export function SuperAdminProfileRoute() {
  const user = useSelector(selectCurrentUser);
  const toast = useSuperAdminToast();
  return <Profile user={user} showToast={toast} />;
}
