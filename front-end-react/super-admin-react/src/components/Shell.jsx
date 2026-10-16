const navigation = [
  ['dashboard', 'dashboard', 'Global Dashboard'],
  ['regional_admins', 'admin_panel_settings', 'Regional Admins'],
  ['global_reports', 'assessment', 'Global Reports'],
  ['notifications', 'notifications', 'System Alerts'],
  ['profile', 'person', 'Profile'],
];

export default function Shell({ user, section, setSection, onLogout, toast, children }) {
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
    onLogout();
    window.location.replace('/login');
  }

  return <>
    <div id="dashboard-page" style={{ display: 'flex', minHeight: '100vh' }}>
      <aside className="sidebar">
        <div className="sb-brand">
          <span className="b-ico"><span className="material-icons-outlined" style={{ fontSize: 24 }}>apartment</span></span>
          <div><h3>RentBro</h3><span>Super Admin Portal</span></div>
        </div>
        <nav className="sb-nav">
          {navigation.map(([key, icon, label]) =>
            <div key={key} className={`nav-item ${section === key ? 'active' : ''}`} onClick={() => setSection(key)}>
              <span className="n-ico"><span className="material-icons-outlined" style={{ fontSize: 24 }}>{icon}</span></span> {label}
            </div>
          )}
        </nav>
      </aside>
      <div className="main-wrap">
        <header className="navbar">
          <div className="nb-left"><h4>Welcome back, {user.name || 'Super Admin'}</h4><p>{user.email || 'admin@pgrentals.com'}</p></div>
          <div className="nb-right">
            <div className="nb-icon" title="Browse PG Discovery Listings" onClick={() => window.location.href = '/listings'}><span className="material-icons-outlined" style={{ fontSize: 24 }}>storefront</span></div>
            <div className="nb-icon" onClick={() => setSection('notifications')}><span className="material-icons-outlined" style={{ fontSize: 24 }}>notifications</span><span className="nb-dot" /></div>
            <div className="nb-icon" title="Settings & Profile" onClick={() => setSection('profile')}><span className="material-icons-outlined" style={{ fontSize: 24 }}>settings</span></div>
            <button className="btn-logout" onClick={logout}>↪ Logout</button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
    <div className={`toast ${toast?.type || ''} ${toast ? 'show' : ''}`} role="status">
      <span className="t-ico">{{ success: '✅', error: '❌', info: 'ℹ️' }[toast?.type] || 'ℹ️'}</span>
      <div className="t-text"><strong>{toast?.title}</strong><span>{toast?.message}</span></div>
    </div>
  </>;
}
