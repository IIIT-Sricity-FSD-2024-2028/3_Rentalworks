import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWardenData } from '../utils/dataStore';

export default function Header() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = React.useState(() => {
    try {
      const u = JSON.parse(sessionStorage.getItem('warden_user')) || JSON.parse(sessionStorage.getItem('pg_user'));
      return u && u.role === 'warden' ? u : null;
    } catch {
      return null;
    }
  });

  React.useEffect(() => {
    const updateUser = () => {
      try {
        const u = JSON.parse(sessionStorage.getItem('warden_user')) || JSON.parse(sessionStorage.getItem('pg_user'));
        if (!u || u.role !== 'warden') {
          window.location.replace('/login');
          return;
        }
        setCurrentUser(u);
      } catch {
        window.location.replace('/login');
      }
    };
    updateUser();
    window.addEventListener('storage', updateUser);
    window.addEventListener('pageshow', updateUser);
    window.addEventListener('popstate', updateUser);
    window.addEventListener('rentbro-logout', updateUser);
    return () => {
      window.removeEventListener('storage', updateUser);
      window.removeEventListener('pageshow', updateUser);
      window.removeEventListener('popstate', updateUser);
      window.removeEventListener('rentbro-logout', updateUser);
    };
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('warden_user');
    sessionStorage.removeItem('pg_user');
    sessionStorage.removeItem('guest_user');
    sessionStorage.removeItem('tenant_user');
    sessionStorage.removeItem('owner_user');
    sessionStorage.removeItem('super_admin_token');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('pg_user');
    try {
      window.dispatchEvent(new Event('rentbro-logout'));
    } catch (_) {}
    window.location.replace('/login');
  };

  const { data } = useWardenData();
  const unreadCount = data.notifications?.filter(n => !n.read).length || 0;

  if (!currentUser) return null;

  return (
    <header className="navbar">
      <div className="navbar-left">
        <h4>Welcome back, {currentUser.name ? currentUser.name.split(' ')[0] : 'Warden'}</h4>
        <p>{currentUser.email || ''}</p>
      </div>
      <div className="navbar-right">
        <div className="nav-icon-btn" onClick={() => navigate('/listings')} title="Browse PG Discovery Listings">
          <span className="material-icons-outlined" style={{ fontSize: '24px' }}>storefront</span>
        </div>
        <div className="nav-icon-btn" onClick={() => navigate('/warden/notifications')} title="Notifications">
          <span className="material-icons-outlined" style={{ fontSize: '24px' }}>notifications</span>
          {unreadCount > 0 && <span className="notif-badge" />}
        </div>
        <div className="nav-icon-btn" onClick={() => navigate('/warden/profile')} title="Profile">
          <span className="material-icons-outlined" style={{ fontSize: '24px' }}>person</span>
        </div>
        <button className="btn-logout" onClick={handleLogout}>↪ Logout</button>
      </div>
    </header>
  );
}
