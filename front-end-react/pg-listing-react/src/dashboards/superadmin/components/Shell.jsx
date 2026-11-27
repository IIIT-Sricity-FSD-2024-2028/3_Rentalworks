import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';

const navigation = [
  ['dashboard', 'dashboard', 'Global Dashboard', '/dashboard/superadmin'],
  ['users', 'manage_accounts', 'Users & Access', '/dashboard/superadmin/users'],
  ['regional_admins', 'admin_panel_settings', 'Regional Admins', '/dashboard/superadmin/regional-admins'],
  ['payments', 'payments', 'Payments', '/dashboard/superadmin/payments'],
  ['subscriptions', 'workspace_premium', 'Subscriptions', '/dashboard/superadmin/subscriptions'],
  ['global_reports', 'assessment', 'Global Reports', '/dashboard/superadmin/global-reports'],
  ['notifications', 'notifications', 'Notifications', '/dashboard/superadmin/notifications'],
  ['profile', 'person', 'Profile', '/dashboard/superadmin/profile'],
];

export default function Shell({ user, section, setSection, onLogout, children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const currentSection = section || (() => {
    if (location.pathname.includes('regional-admins')) return 'regional_admins';
    if (location.pathname.endsWith('/users')) return 'users';
    if (location.pathname.endsWith('/payments')) return 'payments';
    if (location.pathname.endsWith('/subscriptions')) return 'subscriptions';
    if (location.pathname.includes('global-reports')) return 'global_reports';
    if (location.pathname.includes('notifications')) return 'notifications';
    if (location.pathname.includes('profile')) return 'profile';
    return 'dashboard';
  })();

  function logout() {
    if (onLogout) onLogout();
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
          <div className="nb-left"><h4>Welcome back, {user?.name || 'Super Admin'}</h4><p>{user?.email || ''}</p></div>
          <div className="nb-right">
            <div className="nb-icon" title="Browse PG Discovery Listings" onClick={() => navigate('/listings')}><span className="material-icons-outlined" style={{ fontSize: 24 }}>storefront</span></div>
            <div className="nb-icon" title="Notifications & Alerts" onClick={() => handleNavClick('notifications', '/dashboard/superadmin/notifications')}><span className="material-icons-outlined" style={{ fontSize: 24 }}>notifications</span></div>
            <div className="nb-icon" title="Settings & Profile" onClick={() => handleNavClick('profile', '/dashboard/superadmin/profile')}><span className="material-icons-outlined" style={{ fontSize: 24 }}>settings</span></div>
            <button className="btn-logout" onClick={logout}>↪ Logout</button>
          </div>
        </header>
        <main className="content">{children || <Outlet />}</main>
      </div>
    </div>
  </>;
}
