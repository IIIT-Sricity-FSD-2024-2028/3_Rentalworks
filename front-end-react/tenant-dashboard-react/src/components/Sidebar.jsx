import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { apiFetch } from '../services/api';

const Sidebar = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const notifs = await apiFetch('/notifications').catch(() => []);
        if (Array.isArray(notifs)) {
          const count = notifs.filter((n) => !n.isRead && !n.read).length;
          setUnreadCount(count);
        }
      } catch (err) {
        // silent
      }
    };
    fetchUnread();
  }, []);

  return (
    <aside className="sidebar" id="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon"><span className="material-icons-outlined" style={{fontSize: '24px'}}>apartment</span></div>
        <div className="logo-info">
          <div className="logo-name">RentBro</div>
          <div className="logo-role">Tenant Portal</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/tenant/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">⊞</span> Dashboard
        </NavLink>
        <NavLink to="/tenant/issues" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"><span className="material-icons-outlined" style={{fontSize: '24px'}}>warning</span></span> Issues
        </NavLink>
        <NavLink to="/tenant/notifications" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"><span className="material-icons-outlined" style={{fontSize: '24px'}}>notifications</span></span> Notifications
          {unreadCount > 0 && (
            <span className="nav-badge notif-count" id="notif-nav-badge">
              {unreadCount}
            </span>
          )}
        </NavLink>
        <NavLink to="/tenant/complaints" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"><span className="material-icons-outlined" style={{fontSize: '24px'}}>chat</span></span> Complaints
        </NavLink>
        <NavLink to="/tenant/services" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"><span className="material-icons-outlined" style={{fontSize: '24px'}}>build</span></span> Services
        </NavLink>
        <NavLink to="/tenant/payments" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"><span className="material-icons-outlined" style={{fontSize: '24px'}}>credit_card</span></span> Payments
        </NavLink>
        <NavLink to="/tenant/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"><span className="material-icons-outlined" style={{fontSize: '24px'}}>person</span></span> Profile
        </NavLink>
      </nav>
    </aside>
  );
};

export default Sidebar;
