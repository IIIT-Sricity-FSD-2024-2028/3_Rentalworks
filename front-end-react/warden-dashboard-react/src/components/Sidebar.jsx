import React from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/dashboard', icon: 'folder', label: 'Dashboard' },
  { path: '/tenants', icon: 'group', label: 'Tenant Records' },
  { path: '/rooms', icon: 'home', label: 'Room Services' },
  { path: '/violations', icon: 'warning', label: 'Rule Violations' },
  { path: '/complaints', icon: 'chat', label: 'Complaints' },
  { path: '/notifications', icon: 'notifications', label: 'Notifications' },
  { path: '/profile', icon: 'person', label: 'Profile' }
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-icon">
          <span className="material-icons-outlined" style={{ fontSize: '32px' }}>apartment</span>
        </span>
        <div className="brand-text">
          <h3>RentBro</h3>
          <span>Warden Portal</span>
        </div>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <NavLink 
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">
              <span className="material-icons-outlined" style={{ fontSize: '24px' }}>
                {item.icon}
              </span>
            </span> 
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
