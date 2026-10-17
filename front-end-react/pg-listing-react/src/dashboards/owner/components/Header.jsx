import Icon from './Icon';
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

// Header: top navbar with route-based titles, global search, and logout
export default function Header({ onToggleSidebar, unreadNotifsCount = 0, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();

  const getPageMeta = () => {
    switch (location.pathname.replace('/dashboard', '')) {
      case '/owner':
      case '/owner/':
      case '/':
        return { title: 'Dashboard', subtitle: "Welcome back, here's your overview" };
      case '/owner/properties':
        return { title: 'Properties', subtitle: 'Manage all your PG properties' };
      case '/owner/add-property':
        return { title: 'Add Property', subtitle: 'Submit property details for system verification' };
      case '/owner/issues':
        return { title: 'Issues', subtitle: 'Track and resolve property issues' };
      case '/owner/notifications':
        return { title: 'Notifications', subtitle: 'Stay updated with your properties' };
      case '/owner/policy':
        return { title: 'Policy', subtitle: 'Configure PG rules and rental policies' };
      case '/owner/profile':
        return { title: 'Profile', subtitle: 'Manage your account information' };
      case '/owner/subscription':
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
          <Icon className="material-icons-outlined icon-22">menu</Icon>
        </button>
        <div>
          <div className="topbar-title">{title}</div>
          {subtitle && <div className="topbar-subtitle">{subtitle}</div>}
        </div>
      </div>

      <div className="topbar-right topbar-right-group">
        <div className="topbar-search">
          <Icon className="search-icon material-icons icon-20 icon-muted">
            search
          </Icon>
          <input type="search" aria-label="Search properties" placeholder="Search properties" id="globalSearch" onKeyDown={e => { if (e.key === 'Enter') navigate('/dashboard/owner/properties?q=' + encodeURIComponent(e.target.value)); }} />
        </div>

        <Link
          to="/listings"
          className="icon-btn"
          title="Browse PG Discovery Listings"
        >
          <Icon className="material-icons-outlined icon-24">storefront</Icon>
        </Link>

        <Link
          to="/dashboard/owner/notifications"
          className="icon-btn pos-relative"
          title="Notifications"
        >
          <Icon className="material-icons-outlined icon-24">notifications</Icon>
          {unreadNotifsCount > 0 && <span className="notif-dot" id="topbarNotifDot"></span>}
        </Link>

        <Link to="/dashboard/owner/profile" className="icon-btn" title="Settings & Profile">
          <Icon className="material-icons-outlined icon-24">settings</Icon>
        </Link>

        <button id="owner-logout-btn" className="btn-logout-custom" onClick={onLogout}>
          ↪ Logout
        </button>
      </div>
    </header>
  );
}
