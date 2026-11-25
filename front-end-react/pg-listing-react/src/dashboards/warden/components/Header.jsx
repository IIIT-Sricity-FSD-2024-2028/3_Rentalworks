import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout, selectCurrentUser } from '../../../features/auth/authSlice';
import { selectWardenUnreadCount } from '../../../features/warden/wardenSlices';

export default function Header() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const unreadCount = useSelector(selectWardenUnreadCount);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  if (!currentUser) return null;

  return (
    <header className="navbar">
      <div className="navbar-left">
        <h4>Welcome back, {currentUser.name ? currentUser.name.split(' ')[0] : 'Warden'}</h4>
        <p>{currentUser.email || ''}</p>
      </div>
      <div className="navbar-right">
        <div className="nav-icon-btn" onClick={() => navigate('/dashboard/warden/notifications')} title="Notifications">
          <span className="material-icons-outlined" style={{ fontSize: '24px' }}>notifications</span>
          {unreadCount > 0 && <span className="notif-badge" />}
        </div>
        <div className="nav-icon-btn" onClick={() => navigate('/dashboard/warden/profile')} title="Profile">
          <span className="material-icons-outlined" style={{ fontSize: '24px' }}>person</span>
        </div>
        <button className="btn-logout" onClick={handleLogout}>↪ Logout</button>
      </div>
    </header>
  );
}
