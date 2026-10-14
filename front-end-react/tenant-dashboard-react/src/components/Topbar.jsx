import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Topbar = () => {
  const navigate = useNavigate();
  const { tenant, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName = tenant?.name || 'Tenant';
  const displayEmail = tenant?.email || 'tenant@pgrentals.com';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="greeting">Welcome back, {displayName}</div>
        <div className="email">{displayEmail}</div>
      </div>
      <div className="topbar-actions">
        <a
          href="http://localhost:5174/listings"
          className="btn btn-outline btn-sm"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          title="Browse PG listings"
        >
          <span className="material-icons-outlined" style={{ fontSize: '17px' }}>storefront</span>
          Listings
        </a>
        <button className="topbar-btn" onClick={() => navigate('/notifications')} title="Notifications">
          <span className="material-icons-outlined" style={{ fontSize: '24px' }}>notifications</span>
          <span className="notif-dot notif-count"></span>
        </button>
        <button className="topbar-btn" onClick={() => navigate('/profile')} title="Profile">
          <span className="material-icons-outlined" style={{ fontSize: '24px' }}>person</span>
        </button>
        <button className="logout-btn" onClick={handleLogout}>↪ Logout</button>
      </div>
    </header>
  );
};

export default Topbar;
