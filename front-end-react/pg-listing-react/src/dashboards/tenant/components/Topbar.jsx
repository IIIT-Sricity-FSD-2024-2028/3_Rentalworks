import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../../features/auth/authSlice';
import { useSignOut } from '../../../app/hooks';
import { selectUnreadTenantNotifications } from '../../../features/tenant/tenantSlices';

const Topbar = () => {
  const navigate = useNavigate();
  const handleLogout = useSignOut();
  const tenant = useSelector(selectCurrentUser);
  const unreadCount = useSelector(selectUnreadTenantNotifications);

  const displayName = tenant?.name || 'Tenant';
  const displayEmail = tenant?.email || '';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="greeting">Welcome back, {displayName}</div>
        <div className="email">{displayEmail}</div>
      </div>
      <div className="topbar-actions">
        <button
          className="btn btn-outline btn-sm"
          onClick={() => navigate('/listings')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          title="Browse PG listings"
        >
          <span className="material-icons-outlined" style={{ fontSize: '17px' }}>storefront</span>
          Listings
        </button>
        <button className="topbar-btn" onClick={() => navigate('/dashboard/tenant/notifications')} title="Notifications">
          <span className="material-icons-outlined" style={{ fontSize: '24px' }}>notifications</span>
          {unreadCount > 0 && <span className="notif-dot notif-count"></span>}
        </button>
        <button className="topbar-btn" onClick={() => navigate('/dashboard/tenant/profile')} title="Profile">
          <span className="material-icons-outlined" style={{ fontSize: '24px' }}>person</span>
        </button>
        <button className="logout-btn" onClick={handleLogout}>↪ Logout</button>
      </div>
    </header>
  );
};

export default Topbar;
