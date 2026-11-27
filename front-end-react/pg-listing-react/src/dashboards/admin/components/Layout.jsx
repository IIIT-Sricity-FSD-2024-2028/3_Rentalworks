import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import useScreenState from '../../../app/useScreenState';
import { useDispatch, useSelector } from 'react-redux';
import { runThunk } from '../../../app/hooks';
import { changeMyPassword, selectCurrentUser } from '../../../features/auth/authSlice';
import { useSignOut } from '../../../app/hooks';
import { useToast } from './useToast';

const NAV_ITEMS = [
  { to: '/dashboard/admin', icon: 'folder', label: 'Dashboard', end: true },
  { to: '/dashboard/admin/users', icon: 'group', label: 'User Management' },
  { to: '/dashboard/admin/properties', icon: 'apartment', label: 'PG Properties' },
  { to: '/dashboard/admin/bookings', icon: 'calendar_today', label: 'Bookings' },
  { to: '/dashboard/admin/payments', icon: 'credit_card', label: 'Payments' },
  { to: '/dashboard/admin/subscriptions', icon: 'workspace_premium', label: 'Subscriptions' },
  { to: '/dashboard/admin/complaints', icon: 'report_problem', label: 'Complaints' },
  { to: '/dashboard/admin/notifications', icon: 'notifications', label: 'Announcements' },
];

export default function Layout() {
  const location = useLocation();
  const handleLogout = useSignOut();
  const toast = useToast();
  const [sidebarOpen, setSidebarOpen] = useScreenState(false);
  const [profileOpen, setProfileOpen] = useScreenState(false);

  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const [saving, setSaving] = useScreenState(false);

  // Password fields
  const [currPass, setCurrPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confPass, setConfPass] = useState('');

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, setSidebarOpen]);

  if (!user) {
    return null;
  }

  const handleUpdatePassword = async () => {
    if (!currPass) {
      toast('error', 'Security', 'Current password is required');
      return;
    }
    if (newPass.length < 8) {
      toast('error', 'Security', 'New password must be at least 8 characters');
      return;
    }
    if (newPass !== confPass) {
      toast('error', 'Security', 'Passwords do not match');
      return;
    }
    setSaving(true);
    const { ok } = await runThunk(dispatch, changeMyPassword({ currentPassword: currPass, newPassword: newPass }), { success: 'Password updated' });
    setSaving(false);
    if (!ok) return;
    setCurrPass('');
    setNewPass('');
    setConfPass('');
    setProfileOpen(false);
  };

  const roleLabel = user.role === 'super_admin' ? 'Super Administrator' : 'Administrator';

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
              <p id="nb-email">{user?.email || ''}</p>
            </div>
          </div>

          <div className="nb-right">
            <NavLink to="/listings" className="nb-icon" title="Browse PG Discovery Listings">
              <span className="material-icons-outlined" style={{ fontSize: 22 }}>storefront</span>
            </NavLink>
            <NavLink to="/dashboard/admin/notifications" className="nb-icon" title="Announcements">
              <span className="material-icons-outlined" style={{ fontSize: 22 }}>notifications</span>
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
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{user?.email || ''}</div>
                  <span className="badge badge-admin" style={{ marginTop: 4, display: 'inline-flex' }}>
                    {roleLabel}
                  </span>
                </div>
              </div>
              <div className="profile-meta-grid">
                <div className="profile-meta-item"><span>Role</span><strong>{roleLabel}</strong></div>
                <div className="profile-meta-item"><span>Username</span><strong>{user.username || '—'}</strong></div>
                <div className="profile-meta-item"><span>Joined</span><strong>{user.joinDate || '—'}</strong></div>
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
                  placeholder="Min 8 characters"
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
                disabled={saving}
              >
                {saving ? 'Updating…' : 'Update Password'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
