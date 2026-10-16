import { ownerClasses } from "../classes";
import Icon from "./Icon";
import React from "react";
import { NavLink } from "react-router-dom";

// Sidebar: navigation links and dynamic count badges
export default function Sidebar({
  isOpen,
  onClose,
  unreadNotifsCount = 0,
  openIssuesCount = 0,
  user = { name: "Owner", role: "owner" },
}) {
  const navItems = [
    { to: "/owner", icon: "dashboard", label: "Dashboard", end: true },
    { to: "/owner/properties", icon: "apartment", label: "Properties" },
    { to: "/owner/add-property", icon: "add_business", label: "Add Property" },
    {
      to: "/owner/issues",
      icon: "warning",
      label: "Issues",
      badge: openIssuesCount,
      isDanger: true,
    },
    {
      to: "/owner/notifications",
      icon: "notifications",
      label: "Notifications",
      badge: unreadNotifsCount,
    },
    { to: "/owner/policy", icon: "description", label: "Policy" },
    { to: "/owner/profile", icon: "person", label: "Profile" },
    {
      to: "/owner/subscription",
      icon: "workspace_premium",
      label: "Subscription",
    },
  ];

  const initials = (user?.name || "Owner")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      {isOpen && (
        <div
          className={ownerClasses("sidebar-backdrop")}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={ownerClasses(`sidebar ${isOpen ? "open" : ""}`)}
        id="sidebar"
      >
        <div className={ownerClasses("sidebar-logo")}>
          <div className={ownerClasses("logo-icon")}>
            <Icon className={ownerClasses("icon-24")}>apartment</Icon>
          </div>
          <div>
            <div className={ownerClasses("logo-text")}>RentBro</div>
            <div className={ownerClasses("logo-sub")}>Owner Portal</div>
          </div>
        </div>

        <nav className={ownerClasses("sidebar-nav")}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={ownerClasses(
                ({ isActive }) => `nav-item ${isActive ? "active" : ""}`,
              )}
            >
              <span className={ownerClasses("nav-icon")}>
                <Icon className={ownerClasses("icon-20")}>{item.icon}</Icon>
              </span>
              <span>{item.label}</span>

              {item.badge > 0 && (
                <span
                  className={ownerClasses(
                    item.isDanger ? "nav-badge badge-danger" : "nav-badge",
                  )}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className={ownerClasses("sidebar-footer")}>
          <div className={ownerClasses("sidebar-user")}>
            <div className={ownerClasses("user-avatar")}>{initials}</div>
            <div className={ownerClasses("user-info")}>
              <div className={ownerClasses("user-name")}>
                {user?.name || "Property Owner"}
              </div>
              <div className={ownerClasses("user-role")} id="sidebarUserRole">
                Property Owner
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
