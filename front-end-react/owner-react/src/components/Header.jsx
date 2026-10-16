import { ownerClasses } from "../classes";
import Icon from "./Icon";
import React from "react";
import { Link, useLocation } from "react-router-dom";

// Header: top navbar with route-based titles, global search, and logout
export default function Header({
  onToggleSidebar,
  unreadNotifsCount = 0,
  onLogout,
}) {
  const location = useLocation();

  const getPageMeta = () => {
    switch (location.pathname) {
      case "/owner":
      case "/owner/":
      case "/":
        return {
          title: "Dashboard",
          subtitle: "Welcome back, here's your overview",
        };
      case "/owner/properties":
      case "/properties":
        return {
          title: "Properties",
          subtitle: "Manage all your PG properties",
        };
      case "/owner/add-property":
      case "/add-property":
        return {
          title: "Add Property",
          subtitle: "Submit property details for system verification",
        };
      case "/owner/issues":
      case "/issues":
        return {
          title: "Issues",
          subtitle: "Track and resolve property issues",
        };
      case "/owner/notifications":
      case "/notifications":
        return {
          title: "Notifications",
          subtitle: "Stay updated with your properties",
        };
      case "/owner/policy":
      case "/policy":
        return {
          title: "Policy",
          subtitle: "Configure PG rules and rental policies",
        };
      case "/owner/profile":
      case "/profile":
        return {
          title: "Profile",
          subtitle: "Manage your account information",
        };
      case "/owner/subscription":
      case "/subscription":
        return {
          title: "Subscription",
          subtitle: "Request a plan for your properties",
        };
      default:
        return {
          title: "RentBro Owner Portal",
          subtitle: "Property & Tenant Management",
        };
    }
  };

  const { title, subtitle } = getPageMeta();

  return (
    <header className={ownerClasses("topbar")}>
      <div className={ownerClasses("topbar-left")}>
        <button
          id="sidebarToggle"
          className={ownerClasses("icon-btn sidebar-toggle-btn")}
          onClick={onToggleSidebar}
          title="Toggle Navigation"
        >
          <Icon className={ownerClasses("icon-22")}>menu</Icon>
        </button>
        <div>
          <div className={ownerClasses("topbar-title")}>{title}</div>
          {subtitle && (
            <div className={ownerClasses("topbar-subtitle")}>{subtitle}</div>
          )}
        </div>
      </div>

      <div className={ownerClasses("topbar-right topbar-right-group")}>
        <Link
          to="/listings"
          className={ownerClasses("icon-btn")}
          title="Browse PG Discovery Listings"
        >
          <Icon className={ownerClasses("icon-24")}>storefront</Icon>
        </Link>

        <Link
          to="/owner/notifications"
          className={ownerClasses("icon-btn pos-relative")}
          title="Notifications"
        >
          <Icon className={ownerClasses("icon-24")}>notifications</Icon>
          {unreadNotifsCount > 0 && (
            <span
              className={ownerClasses("notif-dot")}
              id="topbarNotifDot"
            ></span>
          )}
        </Link>

        <Link
          to="/owner/profile"
          className={ownerClasses("icon-btn")}
          title="Settings & Profile"
        >
          <Icon className={ownerClasses("icon-24")}>settings</Icon>
        </Link>

        <button
          id="owner-logout-btn"
          className={ownerClasses("btn-logout-custom")}
          onClick={onLogout}
        >
          ↪ Logout
        </button>
      </div>
    </header>
  );
}
