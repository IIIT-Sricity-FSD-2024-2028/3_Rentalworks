import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useToast } from './Toast';

const NAV_ITEMS = [
  { to: '/admin', icon: 'folder', label: 'Dashboard', end: true },
  { to: '/admin/users', icon: 'group', label: 'User Management' },
  { to: '/admin/properties', icon: 'apartment', label: 'PG Properties' },
  { to: '/admin/bookings', icon: 'calendar_today', label: 'Bookings' },
  { to: '/admin/payments', icon: 'credit_card', label: 'Payments' },
  { to: '/admin/subscriptions', icon: 'workspace_premium', label: 'Subscriptions' },
  { to: '/admin/notifications', icon: 'notifications', label: 'Announcements' },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // User state from sessionStorage / localStorage
  const [user, setUser] = useState(() => {
    try {
      const s = sessionStorage.getItem('pg_user') || localStorage.getItem('currentUser') || localStorage.getItem('pg_user');
      if (s) {
        const parsed = JSON.parse(s);
        if (parsed && (parsed.role === 'admin' || parsed.role === 'super_admin')) return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  });

  // Guard: Verify authentication on mount, bfcache restore, and browser history navigation
  useEffect(() => {
    const checkAuth = () => {
      try {
        const s = sessionStorage.getItem('pg_user') || localStorage.getItem('currentUser') || localStorage.getItem('pg_user');
        if (!s) {
          window.location.replace('/login');
          return;
        }
        const parsed = JSON.parse(s);
        if (!parsed || (parsed.role !== 'admin' && parsed.role !== 'super_admin')) {
          window.location.replace('/login');
          return;
        }
        setUser(parsed);
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

  // Password fields
  const [currPass, setCurrPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confPass, setConfPass] = useState('');

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    sessionStorage.removeItem('pg_user');
    sessionStorage.removeItem('guest_user');
    sessionStorage.removeItem('tenant_user');
    sessionStorage.removeItem('warden_user');
    sessionStorage.removeItem('owner_user');
    sessionStorage.removeItem('super_admin_token');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('pg_user');
    try {
      window.dispatchEvent(new Event('rentbro-logout'));
    } catch (_) {}
    window.location.replace('/login');
  };

  if (!user) {
    return null;
  }

  const handleUpdatePassword = () => {
    if (!currPass) {
      toast('error', 'Security', 'Current password is required');
      return;
    }
    if (newPass.length < 6) {
      toast('error', 'Security', 'New password must be at least 6 characters');
      return;
    }
    if (newPass !== confPass) {
      toast('error', 'Security', 'Passwords do not match');
      return;
    }
    toast('success', 'Password Updated', 'Your security credentials have been updated.');
    setCurrPass('');
    setNewPass('');
    setConfPass('');
    setProfileOpen(false);
  };

  return (
    <div className="layout" id="dashboard-page" style={{ display: 'flex', minHeight: '100vh' }}>
      {sidebarOpen && (
        <div
          id="sidebarBackdrop"
          className="sidebar-backdrop active"
          style={{ opacity: 1, pointerEvents: 'all' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sb-brand">
          <span className="b-ico">
            <span className="material-icons-outlined" style={{ fontSize: 24 }}>apartment</span>
          </span>
          <div>
            <h3>RentBro</h3>
            <span>Admin Portal</span>
          </div>
        </div>
        <nav className="sb-nav">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="n-ico">
                <span className="material-icons-outlined" style={{ fontSize: 22 }}>{item.icon}</span>
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* MAIN WRAPPER */}
      <div className="main-wrap">
        <header className="navbar">
          <div className="nb-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              id="sidebarToggle"
              className="nb-icon sidebar-toggle-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title="Toggle Sidebar"
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
            >
              <span className="material-icons-outlined" style={{ fontSize: 24 }}>menu</span>
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h4 id="nb-name">Welcome back, {user?.name || 'Admin'}</h4>
                {user?.region && (
                  <span
                    id="nb-region-badge"
                    style={{
                      background: '#e0e7ff',
                      color: '#4338ca',
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                      display: 'inline-block'
                    }}
                  >
                    Region: {user.region}
                  </span>
                )}
              </div>
              <p id="nb-email">{user?.email || 'admin@pgrentals.com'}</p>
            </div>
          </div>

          <div className="nb-right">
            <NavLink to="/listings" className="nb-icon" title="Browse PG Discovery Listings">
              <span className="material-icons-outlined" style={{ fontSize: 22 }}>storefront</span>
            </NavLink>
            <NavLink to="/admin/notifications" className="nb-icon" title="Announcements">
              <span className="material-icons-outlined" style={{ fontSize: 22 }}>notifications</span>
              <span className="nb-dot" />
            </NavLink>
            <div
              className="nb-icon"
              id="gear-btn"
              title="Settings & Profile"
              onClick={() => setProfileOpen(true)}
              style={{ cursor: 'pointer' }}
            >
              <span className="material-icons-outlined" style={{ fontSize: 22 }}>settings</span>
            </div>
            <button className="btn-logout" id="logout-btn" onClick={handleLogout}>
              ↪ Logout
            </button>
          </div>
        </header>

        <main id="main-content-target" className="content">
          <Outlet />
        </main>
      </div>

      {/* ================================ PROFILE & SETTINGS MODAL ================================ */}
      {profileOpen && (
        <div
          className="modal-overlay show"
          id="profile-modal-overlay"
          onClick={(e) => { if (e.target.id === 'profile-modal-overlay') setProfileOpen(false); }}
        >
          <div className="modal" style={{ width: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-hdr">
              <h3>
                <span className="material-icons-outlined" style={{ fontSize: 24, verticalAlign: 'middle', marginRight: 6 }}>
                  settings
                </span>
                Profile & Settings
              </h3>
              <span className="modal-close" onClick={() => setProfileOpen(false)} style={{ cursor: 'pointer' }}>
                <span className="material-icons-outlined" style={{ fontSize: 24 }}>close</span>
              </span>
            </div>

            <div className="profile-section">
              <div className="profile-avatar-wrap">
                <div className="profile-avatar-circle">
                  {(user?.name || 'A').charAt(0).toUpperCase()}
                </div>
                <div>
                  <strong style={{ fontSize: 15 }}>{user?.name || 'Admin'}</strong>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{user?.email || 'admin@pgrentals.com'}</div>
                  <span className="badge badge-admin" style={{ marginTop: 4, display: 'inline-flex' }}>
                    Super Administrator
                  </span>
                </div>
              </div>
              <div className="profile-meta-grid">
                <div className="profile-meta-item"><span>Role</span><strong>Super Admin</strong></div>
                <div className="profile-meta-item"><span>Last Login</span><strong>Today at 10:45 AM</strong></div>
                <div className="profile-meta-item"><span>Browser</span><strong>Chrome, Windows</strong></div>
                <div className="profile-meta-item"><span>Status</span><strong style={{ color: '#16a34a' }}>Active</strong></div>
              </div>
            </div>

            <div className="profile-section">
              <h4 className="profile-section-title">🔐 Security Settings</h4>
              <div className="modal-field">
                <label>Current Password</label>
                <input
                  type="password"
                  id="pm-curr-pass"
                  placeholder="Enter current password"
                  value={currPass}
                  onChange={e => setCurrPass(e.target.value)}
                />
              </div>
              <div className="modal-field">
                <label>New Password</label>
                <input
                  type="password"
                  id="pm-new-pass"
                  placeholder="Min 6 characters"
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                />
              </div>
              <div className="modal-field">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  id="pm-conf-pass"
                  placeholder="Repeat new password"
                  value={confPass}
                  onChange={e => setConfPass(e.target.value)}
                />
              </div>
              <button
                className="btn-confirm-blue"
                style={{ width: '100%', padding: 10, marginTop: 4 }}
                onClick={handleUpdatePassword}
              >
                Update Password
              </button>
            </div>

            <div className="profile-section" style={{ borderBottom: 'none' }}>
              <h4 className="profile-section-title">
                <span className="material-icons-outlined" style={{ fontSize: 20, verticalAlign: 'middle', marginRight: 4 }}>
                  assignment
                </span>
                Session History
              </h4>
              <div className="session-item">
                <div className="session-dot active-dot" />
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: 12 }}>Current Session</strong>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Today at 10:45 AM · Chrome · Windows · 192.168.1.1</div>
                </div>
                <span className="badge badge-active" style={{ fontSize: 10 }}>Active</span>
              </div>
              <div className="session-item">
                <div className="session-dot" />
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: 12 }}>Previous Session</strong>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Yesterday at 6:30 PM · Chrome · Windows</div>
                </div>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>Ended</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
