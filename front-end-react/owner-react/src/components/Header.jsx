import React from 'react';
import { Link, useLocation } from 'react-router-dom';

// Header: top navbar with route-based titles, global search, and logout
export default function Header({ onToggleSidebar, unreadNotifsCount = 0, onLogout }) {
  const location = useLocation();

  const getPageMeta = () => {
    switch (location.pathname) {
      case '/owner':
      case '/owner/':
      case '/':
        return { title: 'Dashboard', subtitle: "Welcome back, here's your overview" };
      case '/owner/properties':
      case '/properties':
        return { title: 'Properties', subtitle: 'Manage all your PG properties' };
      case '/owner/add-property':
      case '/add-property':
        return { title: 'Add Property', subtitle: 'Submit property details for system verification' };
      case '/owner/issues':
      case '/issues':
        return { title: 'Issues', subtitle: 'Track and resolve property issues' };
      case '/owner/notifications':
      case '/notifications':
        return { title: 'Notifications', subtitle: 'Stay updated with your properties' };
      case '/owner/policy':
      case '/policy':
        return { title: 'Policy', subtitle: 'Configure PG rules and rental policies' };
      case '/owner/profile':
      case '/profile':
        return { title: 'Profile', subtitle: 'Manage your account information' };
      case '/owner/subscription':
      case '/subscription':
        return { title: 'Subscription', subtitle: 'Select a plan to activate and list properties' };
      default:
        return { title: 'RentBro Owner Portal', subtitle: 'Property & Tenant Management' };
    }
  };

  const { title, subtitle } = getPageMeta();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          id="sidebarToggle"
          className="icon-btn sidebar-toggle-btn"
          onClick={onToggleSidebar}
          title="Toggle Navigation"
        >
          <span className="material-icons-outlined icon-22">menu</span>
        </button>
        <div>
          <div className="topbar-title">{title}</div>
          {subtitle && <div className="topbar-subtitle">{subtitle}</div>}
        </div>
      </div>

      <div className="topbar-right topbar-right-group">
        <div className="topbar-search">
          <span className="search-icon material-icons icon-20 icon-muted">
            search
          </span>
          <input type="text" placeholder="Search" id="globalSearch" />
        </div>

        <Link
          to="/listings"
          className="icon-btn"
          title="Browse PG Discovery Listings"
        >
          <span className="material-icons-outlined icon-24">storefront</span>
        </Link>

        <Link
          to="/owner/notifications"
          className="icon-btn pos-relative"
          title="Notifications"
        >
          <span className="material-icons-outlined icon-24">notifications</span>
          {unreadNotifsCount > 0 && <span className="notif-dot" id="topbarNotifDot"></span>}
        </Link>

        <Link to="/owner/profile" className="icon-btn" title="Settings & Profile">
          <span className="material-icons-outlined icon-24">settings</span>
        </Link>

        <button id="owner-logout-btn" className="btn-logout-custom" onClick={onLogout}>
          ↪ Logout
        </button>
      </div>
    </header>
  );
}
