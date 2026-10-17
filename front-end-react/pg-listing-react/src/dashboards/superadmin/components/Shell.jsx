import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';

const navigation = [
  ['dashboard', 'dashboard', 'Global Dashboard', '/dashboard/superadmin'],
  ['regional_admins', 'admin_panel_settings', 'Regional Admins', '/dashboard/superadmin/regional-admins'],
  ['global_reports', 'assessment', 'Global Reports', '/dashboard/superadmin/global-reports'],
  ['notifications', 'notifications', 'System Alerts', '/dashboard/superadmin/notifications'],
  ['profile', 'person', 'Profile', '/dashboard/superadmin/profile'],
];

export default function Shell({ user, section, setSection, onLogout, toast, children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const currentSection = section || (() => {
    if (location.pathname.includes('regional-admins')) return 'regional_admins';
    if (location.pathname.includes('global-reports')) return 'global_reports';
    if (location.pathname.includes('notifications')) return 'notifications';
    if (location.pathname.includes('profile')) return 'profile';
    return 'dashboard';
  })();

  function logout() {
    sessionStorage.removeItem('pg_user');
    sessionStorage.removeItem('super_admin_token');
    sessionStorage.removeItem('guest_user');
    sessionStorage.removeItem('tenant_user');
    sessionStorage.removeItem('warden_user');
    sessionStorage.removeItem('owner_user');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('pg_user');
    try {
      window.dispatchEvent(new Event('rentbro-logout'));
    } catch (_) {}
    if (onLogout) onLogout();
    window.location.replace('/login');
  }

  const handleNavClick = (key, path) => {
    if (setSection) setSection(key);
    navigate(path);
  };

  return <>
    <div id="dashboard-page" style={{ display: 'flex', minHeight: '100vh' }}>
      <aside className="sidebar">
        <div className="sb-brand">
          <span className="b-ico"><span className="material-icons-outlined" style={{ fontSize: 24 }}>apartment</span></span>
          <div><h3>RentBro</h3><span>Super Admin Portal</span></div>
        </div>
        <nav className="sb-nav">
          {navigation.map(([key, icon, label, path]) =>
            <div
              key={key}
              className={`nav-item ${currentSection === key ? 'active' : ''}`}
              onClick={() => handleNavClick(key, path)}
            >
              <span className="n-ico"><span className="material-icons-outlined" style={{ fontSize: 24 }}>{icon}</span></span> {label}
            </div>
          )}
        </nav>
      </aside>
      <div className="main-wrap">
        <header className="navbar">
          <div className="nb-left"><h4>Welcome back, {user?.name || 'Super Admin'}</h4><p>{user?.email || 'admin@pgrentals.com'}</p></div>
          <div className="nb-right">
            <div className="nb-icon" title="Browse PG Discovery Listings" onClick={() => navigate('/listings')}><span className="material-icons-outlined" style={{ fontSize: 24 }}>storefront</span></div>
            <div className="nb-icon" onClick={() => handleNavClick('notifications', '/dashboard/superadmin/notifications')}><span className="material-icons-outlined" style={{ fontSize: 24 }}>notifications</span><span className="nb-dot" /></div>
            <div className="nb-icon" title="Settings & Profile" onClick={() => handleNavClick('profile', '/dashboard/superadmin/profile')}><span className="material-icons-outlined" style={{ fontSize: 24 }}>settings</span></div>
            <button className="btn-logout" onClick={logout}>↪ Logout</button>
          </div>
        </header>
        <main className="content">{children || <Outlet />}</main>
      </div>
    </div>
    <div className={`toast ${toast?.type || ''} ${toast ? 'show' : ''}`} role="status">
      <span className="t-ico">{{ success: '✅', error: '❌', info: 'ℹ️' }[toast?.type] || 'ℹ️'}</span>
      <div className="t-text"><strong>{toast?.title}</strong><span>{toast?.message}</span></div>
    </div>
  </>;
}
