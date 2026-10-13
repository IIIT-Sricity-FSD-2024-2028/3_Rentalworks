import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWardenData } from '../utils/dataStore';

export default function Header() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = React.useState(() => {
    return JSON.parse(sessionStorage.getItem('warden_user')) ||
      JSON.parse(sessionStorage.getItem('pg_user')) || {
      name: 'Warden Officer',
      email: 'warden@pgrentals.com'
    };
  });

  React.useEffect(() => {
    const updateUser = () => {
      const u = JSON.parse(sessionStorage.getItem('warden_user')) ||
        JSON.parse(sessionStorage.getItem('pg_user'));
      if (u) setCurrentUser(u);
    };
    window.addEventListener('storage', updateUser);
    return () => window.removeEventListener('storage', updateUser);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('warden_user');
    sessionStorage.removeItem('pg_user'); // Required for central login architecture
    window.location.href = '../../login/login/login.html';
  };

  const { data } = useWardenData();
  const unreadCount = data.notifications?.filter(n => !n.read).length || 0;

  return (
    <header className="navbar">
      <div className="navbar-left">
        <h4>Welcome back, {currentUser.name ? currentUser.name.split(' ')[0] : 'Warden'}</h4>
        <p>{currentUser.email}</p>
      </div>
      <div className="navbar-right">
        <div className="nav-icon-btn" onClick={() => navigate('/notifications')} title="Notifications">
          <span className="material-icons-outlined" style={{ fontSize: '24px' }}>notifications</span>
          {unreadCount > 0 && <span className="notif-badge" />}
        </div>
        <div className="nav-icon-btn" onClick={() => navigate('/profile')}>
          <span className="material-icons-outlined" style={{ fontSize: '24px' }}>person</span>
        </div>
        <button className="btn-logout" onClick={handleLogout}>↪ Logout</button>
      </div>
    </header>
  );
}
