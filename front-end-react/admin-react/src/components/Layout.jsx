import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useToast } from './Toast';

const NAV_ITEMS = [
  { to: '/', icon: 'folder', label: 'Dashboard', end: true },
  { to: '/users', icon: 'group', label: 'User Management' },
  { to: '/properties', icon: 'apartment', label: 'PG Properties' },
  { to: '/bookings', icon: 'calendar_today', label: 'Bookings' },
  { to: '/payments', icon: 'credit_card', label: 'Payments' },
  { to: '/subscriptions', icon: 'workspace_premium', label: 'Subscriptions' },
  { to: '/notifications', icon: 'notifications', label: 'Announcements' },
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
      const s = sessionStorage.getItem('pg_user') || localStorage.getItem('pg_user');
      return s ? JSON.parse(s) : { name: 'Admin', email: 'admin@pgrentals.com', role: 'admin' };
    } catch {
      return { name: 'Admin', email: 'admin@pgrentals.com', role: 'admin' };
    }
  });

  // 2FA state
  const [twoFA, setTwoFA] = useState(() => {
    return localStorage.getItem('admin_2fa_enabled') === 'true';
  });

  // Password fields
  const [currPass, setCurrPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confPass, setConfPass] = useState('');

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    sessionStorage.removeItem('pg_user');
    localStorage.removeItem('pg_user');
    toast('info', 'Logged Out', 'You have been logged out.');
    // Redirect to login
    window.location.href = '../../login/login/login.html';
  };

  const handleToggle2FA = (e) => {
    const checked = e.target.checked;
    setTwoFA(checked);
    localStorage.setItem('admin_2fa_enabled', checked ? 'true' : 'false');
    toast('success', 'Two-Factor Authentication', checked ? '2FA has been enabled' : '2FA has been disabled');
  };

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
            <NavLink to="/notifications" className="nb-icon" title="Announcements">
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

            <div className="profile-section">
              <h4 className="profile-section-title">🛡️ System Security</h4>
              <div className="twofa-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: 13 }}>Two-Factor Authentication (2FA)</strong>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Add an extra layer of security</div>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" id="twofa-toggle" checked={twoFA} onChange={handleToggle2FA} />
                  <span className="toggle-slider" />
                </label>
              </div>
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
