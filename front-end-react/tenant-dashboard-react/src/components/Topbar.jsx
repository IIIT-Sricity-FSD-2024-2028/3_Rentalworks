import React from 'react';
import { useNavigate } from 'react-router-dom';

const Topbar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Navigate back to login or home (to be implemented)
    navigate('/login');
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="greeting">Welcome back, Tenant</div>
        <div className="email">tenant@pgrentals.com</div>
      </div>
      <div className="topbar-actions">
        <button className="topbar-btn" onClick={() => navigate('/notifications')} title="Notifications">
          <span className="material-icons-outlined" style={{fontSize: '24px'}}>notifications</span>
          <span className="notif-dot notif-count"></span>
        </button>
        <button className="topbar-btn" onClick={() => navigate('/profile')} title="Profile">
          <span className="material-icons-outlined" style={{fontSize: '24px'}}>person</span>
        </button>
        <button className="logout-btn" onClick={handleLogout}>↪ Logout</button>
      </div>
    </header>
  );
};

export default Topbar;
