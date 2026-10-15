import React from 'react';
import { NavLink } from 'react-router-dom';

// Sidebar: navigation links and dynamic count badges
export default function Sidebar({
  isOpen,
  onClose,
  unreadNotifsCount = 0,
  openIssuesCount = 0,
  user = { name: 'Rajesh Kumar', role: 'owner' }
}) {
  const navItems = [
    { to: '/owner', icon: 'dashboard', label: 'Dashboard', end: true },
    { to: '/owner/properties', icon: 'apartment', label: 'Properties' },
    { to: '/owner/add-property', icon: 'add_business', label: 'Add Property' },
    { to: '/owner/issues', icon: 'warning', label: 'Issues', badge: openIssuesCount, isDanger: true },
    { to: '/owner/notifications', icon: 'notifications', label: 'Notifications', badge: unreadNotifsCount },
    { to: '/owner/policy', icon: 'description', label: 'Policy' },
    { to: '/owner/profile', icon: 'person', label: 'Profile' },
    { to: '/owner/subscription', icon: 'workspace_premium', label: 'Subscription' },
  ];

  const initials = (user.name || 'Owner')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`} id="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <span className="material-icons-outlined icon-24">apartment</span>
          </div>
          <div>
            <div className="logo-text">RentBro</div>
            <div className="logo-sub">Owner Portal</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">
                <span className="material-icons-outlined icon-20">{item.icon}</span>
              </span>
              <span>{item.label}</span>

              {item.badge > 0 && (
                <span className={item.isDanger ? 'nav-badge badge-danger' : 'nav-badge'}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name">{user.name || 'Property Owner'}</div>
              <div className="user-role" id="sidebarUserRole">Property Owner</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
