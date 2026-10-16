import { ownerClasses } from "../classes";
import Icon from "../components/Icon";
import React from "react";
import { Link } from "react-router-dom";

// Dashboard: Overview metrics, recent issues, occupancy progress, and quick links
export default function Dashboard({
  properties = [],
  issues = [],
  notifications = [],
}) {
  const totalProps = properties.length;
  const activeProps = properties.filter(
    (p) =>
      (p.status || "").toLowerCase() === "active" ||
      (p.status || "").toLowerCase() === "approved",
  );
  const totalRooms = properties.reduce(
    (acc, p) => acc + (p.totalRooms || 0),
    0,
  );
  const occupiedRooms = properties.reduce(
    (acc, p) => acc + (p.occupiedRooms || 0),
    0,
  );
  const occupancyPct = totalRooms
    ? Math.round((occupiedRooms / totalRooms) * 100)
    : 0;
  const monthlyRevenue = properties.reduce(
    (acc, p) =>
      acc +
      (p.estimatedMonthlyRent ?? (p.occupiedRooms || 0) * (p.monthlyRent || 0)),
    0,
  );
  const openIssues = issues.filter(
    (i) => (i.status || "").toLowerCase() === "open",
  ).length;
  const unreadNotifs = notifications.filter((n) => !n.read).length;

  const recentIssues = issues.slice(0, 4);
  const recentNotifs = notifications.slice(0, 4);

  const formatCurrency = (amount) => {
    return "₹" + Number(amount || 0).toLocaleString("en-IN");
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
  };

  const getCategoryIcon = (category) => {
    const icons = {
      Maintenance: "build",
      Internet: "wifi",
      Appliance: "computer",
      Housekeeping: "cleaning_services",
      Security: "lock",
      Electrical: "flash_on",
      Plumbing: "shower",
    };
    return icons[category] || "push_pin";
  };

  const getNotifIcon = (type) => {
    const icons = {
      reminder: "notifications",
      alert: "warning",
      success: "check_circle",
      warning: "error",
      info: "info",
    };
    return icons[type] || "info";
  };

  const getOccupancyClass = (pct) => {
    if (pct >= 75) return "high";
    if (pct >= 40) return "medium";
    return "low";
  };

  return (
    <div>
      {properties.some(p => p.capacityWarning) && <p className={ownerClasses("alert-danger-box")}>Some rooms have more recorded occupants than capacity. Review room records; rent estimates use the recorded counts.</p>}
      {/* 4 Stat Cards */}
      <div className={ownerClasses("stats-grid")}>
        <div className={ownerClasses("stat-card")}>
          <div className={ownerClasses("stat-icon purple")}>
            <Icon className={ownerClasses("")}>apartment</Icon>
          </div>
          <div className={ownerClasses("stat-info")}>
            <div className={ownerClasses("stat-value")}>{totalProps}</div>
            <div className={ownerClasses("stat-label")}>Total Properties</div>
            <div className={ownerClasses("stat-change up")}>
              ↑ {activeProps.length} active
            </div>
          </div>
        </div>

        <div className={ownerClasses("stat-card")}>
          <div className={ownerClasses("stat-icon green")}>
            <Icon className={ownerClasses("")}>bed</Icon>
          </div>
          <div className={ownerClasses("stat-info")}>
            <div className={ownerClasses("stat-value")}>{occupancyPct}%</div>
            <div className={ownerClasses("stat-label")}>Occupancy Rate</div>
            <div
              className={ownerClasses(
                occupancyPct >= 70 ? "stat-change up" : "stat-change down",
              )}
            >
              {occupiedRooms}/{totalRooms} rooms filled
            </div>
          </div>
        </div>

        <div className={ownerClasses("stat-card")}>
          <div className={ownerClasses("stat-icon orange")}>
            <Icon className={ownerClasses("")}>payments</Icon>
          </div>
          <div className={ownerClasses("stat-info")}>
            <div className={ownerClasses("stat-value")}>
              {formatCurrency(monthlyRevenue)}
            </div>
            <div className={ownerClasses("stat-label")}>
              Estimated Monthly Rent
            </div>
            <div className={ownerClasses("stat-change up")}>
              ↑ Based on recorded occupancy
            </div>
          </div>
        </div>

        <div className={ownerClasses("stat-card")}>
          <div className={ownerClasses("stat-icon red")}>
            <Icon className={ownerClasses("icon-22 icon-danger")}>warning</Icon>
          </div>
          <div className={ownerClasses("stat-info")}>
            <div className={ownerClasses("stat-value")}>{openIssues}</div>
            <div className={ownerClasses("stat-label")}>Open Issues</div>
            <div
              className={ownerClasses(
                openIssues === 0 ? "stat-change up" : "stat-change down",
              )}
            >
              {openIssues === 0 ? "All clear!" : `${openIssues} need attention`}
            </div>
          </div>
        </div>
      </div>

      {/* Row 1: Recent Issues & Properties Overview */}
      <div className={ownerClasses("grid-2 mb-24")}>
        <div className={ownerClasses("card")}>
          <div className={ownerClasses("card-header")}>
            <div>
              <div className={ownerClasses("card-title")}>Recent Issues</div>
              <div className={ownerClasses("card-subtitle")}>
                {issues.length} total issues reported
              </div>
            </div>
            <Link
              to="/owner/issues"
              className={ownerClasses("btn btn-secondary btn-sm")}
            >
              View All
            </Link>
          </div>

          {recentIssues.length === 0 ? (
            <div className={ownerClasses("empty-state p-30-20")}>
              <div className={ownerClasses("empty-icon")}>
                <Icon className={ownerClasses("icon-48 icon-success")}>
                  check_circle
                </Icon>
              </div>
              <h3>No Issues</h3>
              <p>All properties are running smoothly</p>
            </div>
          ) : (
            recentIssues.map((issue) => (
              <Link
                key={issue.id}
                to="/owner/issues"
                className={ownerClasses("issue-card issue-link-card")}
              >
                <div
                  className={ownerClasses(
                    `issue-icon ${issue.priority ? issue.priority.toLowerCase() : "medium"}`,
                  )}
                >
                  <Icon className={ownerClasses("icon-18")}>
                    {getCategoryIcon(issue.category)}
                  </Icon>
                </div>
                <div className={ownerClasses("issue-body")}>
                  <div className={ownerClasses("issue-title icon-14")}>
                    {issue.title}
                  </div>
                  <div className={ownerClasses("issue-meta")}>
                    <span>{issue.propertyName}</span>
                    <span>•</span>
                    <span
                      className={ownerClasses(
                        `badge badge-${(issue.status || "open").toLowerCase().replace(" ", "")}`,
                      )}
                    >
                      {issue.status}
                    </span>
                    <span
                      className={ownerClasses(
                        `badge badge-${(issue.priority || "medium").toLowerCase()}`,
                      )}
                    >
                      {issue.priority}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Occupancy Breakdown */}
        <div className={ownerClasses("card")}>
          <div className={ownerClasses("card-header")}>
            <div>
              <div className={ownerClasses("card-title")}>
                Property Overview
              </div>
              <div className={ownerClasses("card-subtitle")}>
                Occupancy breakdown
              </div>
            </div>
            <Link
              to="/owner/properties"
              className={ownerClasses("btn btn-secondary btn-sm")}
            >
              Manage
            </Link>
          </div>

          {properties.length === 0 ? (
            <div className={ownerClasses("empty-state p-30-20")}>
              <div className={ownerClasses("empty-icon")}>
                <Icon className={ownerClasses("icon-48 icon-light")}>
                  apartment
                </Icon>
              </div>
              <h3>No Properties</h3>
              <p>
                <Link
                  to="/owner/add-property"
                  className={ownerClasses("text-primary-cost")}
                >
                  Add your first property
                </Link>
              </p>
            </div>
          ) : (
            properties.map((p) => {
              const pct = p.totalRooms
                ? Math.round((p.occupiedRooms / p.totalRooms) * 100)
                : 0;
              const cls = getOccupancyClass(pct);
              return (
                <div key={p.id} className={ownerClasses("mb-16")}>
                  <div className={ownerClasses("flex-between mb-4")}>
                    <div>
                      <div className={ownerClasses("prop-title-row")}>
                        {p.name}
                      </div>
                      <div className={ownerClasses("prop-sub-row")}>
                        {p.city} • {p.type}
                      </div>
                    </div>
                    <span
                      className={ownerClasses(
                        `badge badge-${(p.status || "active").toLowerCase()}`,
                      )}
                    >
                      {p.status}
                    </span>
                  </div>

                  <div className={ownerClasses("occupancy-bar-wrap")}>
                    <div className={ownerClasses("occupancy-bar-label")}>
                      <span>
                        {p.occupiedRooms}/{p.totalRooms} rooms
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div className={ownerClasses("occupancy-bar")}>
                      <div
                        className={ownerClasses(`occupancy-fill ${cls}`)}
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Row 2: Notifications & Quick Actions */}
      <div className={ownerClasses("grid-2")}>
        <div className={ownerClasses("card")}>
          <div className={ownerClasses("card-header")}>
            <div>
              <div className={ownerClasses("card-title")}>Notifications</div>
              <div className={ownerClasses("card-subtitle")}>
                {unreadNotifs} unread
              </div>
            </div>
            <Link
              to="/owner/notifications"
              className={ownerClasses("btn btn-secondary btn-sm")}
            >
              View All
            </Link>
          </div>

          {recentNotifs.map((n) => (
            <Link
              key={n.id}
              to="/owner/notifications"
              className={ownerClasses(
                `notif-card ${!n.read ? "unread" : ""} notif-link-card`,
              )}
            >
              {!n.read && <div className={ownerClasses("unread-dot")}></div>}
              <div
                className={ownerClasses(`notif-icon notif-${n.type || "info"}`)}
              >
                <Icon className={ownerClasses("icon-18")}>
                  {getNotifIcon(n.type)}
                </Icon>
              </div>
              <div className={ownerClasses("notif-body")}>
                <div className={ownerClasses("notif-title")}>{n.title}</div>
                <div className={ownerClasses("notif-date")}>
                  {formatDate(n.date)}
                </div>
              </div>
            </Link>
          ))}

          {notifications.length === 0 && (
            <p className={ownerClasses("text-center text-muted p-20")}>
              No notifications
            </p>
          )}
        </div>

        {/* Quick Actions */}
        <div className={ownerClasses("card")}>
          <div className={ownerClasses("card-header")}>
            <div className={ownerClasses("card-title")}>Quick Actions</div>
          </div>

          <div className={ownerClasses("flex-col-gap-12")}>
            <Link
              to="/owner/add-property"
              className={ownerClasses("btn btn-primary btn-start")}
            >
              <Icon className={ownerClasses("icon-18")}>add</Icon> Add New
              Property
            </Link>
            <Link
              to="/owner/issues"
              className={ownerClasses("btn btn-secondary btn-start")}
            >
              <Icon className={ownerClasses("icon-18")}>warning</Icon> Manage
              Issues
              <span className={ownerClasses("nav-badge badge-danger ml-auto")}>
                {openIssues}
              </span>
            </Link>
            <Link
              to="/owner/policy"
              className={ownerClasses("btn btn-secondary btn-start")}
            >
              <Icon className={ownerClasses("icon-18")}>description</Icon>{" "}
              Review Policy
            </Link>
            <Link
              to="/owner/notifications"
              className={ownerClasses("btn btn-secondary btn-start")}
            >
              <Icon className={ownerClasses("icon-18")}>notifications</Icon>{" "}
              Notifications
              <span className={ownerClasses("nav-badge ml-auto")}>
                {unreadNotifs}
              </span>
            </Link>
            <Link
              to="/owner/profile"
              className={ownerClasses("btn btn-secondary btn-start")}
            >
              <Icon className={ownerClasses("icon-18")}>person</Icon> Update
              Profile
            </Link>
          </div>

          <div className={ownerClasses("monthly-summary-box")}>
            <div className={ownerClasses("monthly-summary-title")}>
              <Icon className={ownerClasses("icon-16 icon-middle")}>
                bar_chart
              </Icon>{" "}
              Monthly Summary
            </div>
            <div className={ownerClasses("monthly-summary-row")}>
              <span>Recorded Occupants</span>
              <strong>{properties.every(p => p.totalOccupants !== null) ? properties.reduce((total, p) => total + p.totalOccupants, 0) : "Not recorded"}</strong>
            </div>
            <div className={ownerClasses("monthly-summary-row")}>
              <span>Vacant Rooms</span>
              <strong>{totalRooms - occupiedRooms}</strong>
            </div>
            <div className={ownerClasses("monthly-summary-row-last")}>
              <span>Est. Revenue</span>
              <strong className={ownerClasses("text-primary-cost")}>
                {formatCurrency(monthlyRevenue)}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
