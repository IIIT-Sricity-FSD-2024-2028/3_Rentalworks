import Icon from '../components/Icon';
import React from 'react';
import { Link } from 'react-router-dom';

// Dashboard: Overview metrics, recent issues, occupancy progress, and quick links
export default function Dashboard({ properties = [], issues = [], notifications = [] }) {
  const totalProps = properties.length;
  const activeProps = properties.filter(
    (p) => (p.status || '').toLowerCase() === 'active' || (p.status || '').toLowerCase() === 'approved'
  );
  const totalRooms = properties.reduce((acc, p) => acc + (p.totalRooms || 0), 0);
  const occupiedRooms = properties.reduce((acc, p) => acc + (p.occupiedRooms || 0), 0);
  const occupancyPct = totalRooms ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
  const monthlyRevenue = properties.reduce(
    (acc, p) => acc + (p.occupiedRooms || 0) * (p.monthlyRent || p.rentMin || 0),
    0
  );
  const openIssues = issues.filter(
    (i) => (i.status || '').toLowerCase() === 'open'
  ).length;
  const unreadNotifs = notifications.filter((n) => !n.read).length;

  const recentIssues = issues.slice(0, 4);
  const recentNotifs = notifications.slice(0, 4);

  const formatCurrency = (amount) => {
    return '₹' + Number(amount || 0).toLocaleString('en-IN');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getCategoryIcon = (category) => {
    const icons = {
      Maintenance: 'build',
      Internet: 'wifi',
      Appliance: 'computer',
      Housekeeping: 'cleaning_services',
      Security: 'lock',
      Electrical: 'flash_on',
      Plumbing: 'shower',
    };
    return icons[category] || 'push_pin';
  };

  const getNotifIcon = (type) => {
    const icons = {
      reminder: 'notifications',
      alert: 'warning',
      success: 'check_circle',
      warning: 'error',
      info: 'info',
    };
    return icons[type] || 'info';
  };

  const getOccupancyClass = (pct) => {
    if (pct >= 75) return 'high';
    if (pct >= 40) return 'medium';
    return 'low';
  };

  return (
    <div>
      {/* 4 Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple">
            <Icon className="material-icons">apartment</Icon>
          </div>
          <div className="stat-info">
            <div className="stat-value">{totalProps}</div>
            <div className="stat-label">Total Properties</div>
            <div className="stat-change up">↑ {activeProps.length} active</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <Icon className="material-icons">bed</Icon>
          </div>
          <div className="stat-info">
            <div className="stat-value">{occupancyPct}%</div>
            <div className="stat-label">Occupancy Rate</div>
            <div className={occupancyPct >= 70 ? 'stat-change up' : 'stat-change down'}>
              {occupiedRooms}/{totalRooms} rooms filled
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <Icon className="material-icons">payments</Icon>
          </div>
          <div className="stat-info">
            <div className="stat-value">{formatCurrency(monthlyRevenue)}</div>
            <div className="stat-label">Monthly Revenue</div>
            <div className="stat-change up">↑ Estimated this month</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon red">
            <Icon className="material-icons icon-22 icon-danger">warning</Icon>
          </div>
          <div className="stat-info">
            <div className="stat-value">{openIssues}</div>
            <div className="stat-label">Open Issues</div>
            <div className={openIssues === 0 ? 'stat-change up' : 'stat-change down'}>
              {openIssues === 0 ? 'All clear!' : `${openIssues} need attention`}
            </div>
          </div>
        </div>
      </div>

      {/* Row 1: Recent Issues & Properties Overview */}
      <div className="grid-2 mb-24">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recent Issues</div>
              <div className="card-subtitle">{issues.length} total issues reported</div>
            </div>
            <Link to="/dashboard/owner/issues" className="btn btn-secondary btn-sm">
              View All
            </Link>
          </div>

          {recentIssues.length === 0 ? (
            <div className="empty-state p-30-20">
              <div className="empty-icon">
                <Icon className="material-icons icon-48 icon-success">check_circle</Icon>
              </div>
              <h3>No Issues</h3>
              <p>All properties are running smoothly</p>
            </div>
          ) : (
            recentIssues.map((issue) => (
              <Link
                key={issue.id}
                to="/dashboard/owner/issues"
                className="issue-card issue-link-card"
              >
                <div className={`issue-icon ${issue.priority ? issue.priority.toLowerCase() : 'medium'}`}>
                  <Icon className="material-icons icon-18">
                    {getCategoryIcon(issue.category)}
                  </Icon>
                </div>
                <div className="issue-body">
                  <div className="issue-title icon-14">{issue.title}</div>
                  <div className="issue-meta">
                    <span>{issue.propertyName}</span>
                    <span>•</span>
                    <span className={`badge badge-${(issue.status || 'open').toLowerCase().replace(' ', '')}`}>
                      {issue.status}
                    </span>
                    <span className={`badge badge-${(issue.priority || 'medium').toLowerCase()}`}>
                      {issue.priority}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Occupancy Breakdown */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Property Overview</div>
              <div className="card-subtitle">Occupancy breakdown</div>
            </div>
            <Link to="/dashboard/owner/properties" className="btn btn-secondary btn-sm">
              Manage
            </Link>
          </div>

          {properties.length === 0 ? (
            <div className="empty-state p-30-20">
              <div className="empty-icon">
                <Icon className="material-icons icon-48 icon-light">apartment</Icon>
              </div>
              <h3>No Properties</h3>
              <p>
                <Link to="/dashboard/owner/add-property" className="text-primary-cost">
                  Add your first property
                </Link>
              </p>
            </div>
          ) : (
            properties.map((p) => {
              const pct = p.totalRooms ? Math.round((p.occupiedRooms / p.totalRooms) * 100) : 0;
              const cls = getOccupancyClass(pct);
              return (
                <div key={p.id} className="mb-16">
                  <div className="flex-between mb-4">
                    <div>
                      <div className="prop-title-row">{p.name}</div>
                      <div className="prop-sub-row">{p.city} • {p.type}</div>
                    </div>
                    <span className={`badge badge-${(p.status || 'active').toLowerCase()}`}>
                      {p.status}
                    </span>
                  </div>

                  <div className="occupancy-bar-wrap">
                    <div className="occupancy-bar-label">
                      <span>{p.occupiedRooms}/{p.totalRooms} rooms</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="occupancy-bar">
                      <div
                        className={`occupancy-fill ${cls} pct-${pct}`}
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
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Notifications</div>
              <div className="card-subtitle">{unreadNotifs} unread</div>
            </div>
            <Link to="/dashboard/owner/notifications" className="btn btn-secondary btn-sm">
              View All
            </Link>
          </div>

          {recentNotifs.map((n) => (
            <Link
              key={n.id}
              to="/dashboard/owner/notifications"
              className={`notif-card ${!n.read ? 'unread' : ''} notif-link-card`}
            >
              {!n.read && <div className="unread-dot"></div>}
              <div className={`notif-icon notif-${n.type || 'info'}`}>
                <Icon className="material-icons icon-18">
                  {getNotifIcon(n.type)}
                </Icon>
              </div>
              <div className="notif-body">
                <div className="notif-title">{n.title}</div>
                <div className="notif-date">{formatDate(n.date)}</div>
              </div>
            </Link>
          ))}

          {notifications.length === 0 && (
            <p className="text-center text-muted p-20">No notifications</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Quick Actions</div>
          </div>

          <div className="flex-col-gap-12">
            <Link to="/dashboard/owner/add-property" className="btn btn-primary btn-start">
              <Icon className="material-icons icon-18">add</Icon> Add New Property
            </Link>
            <Link to="/dashboard/owner/issues" className="btn btn-secondary btn-start">
              <Icon className="material-icons icon-18">warning</Icon> Manage Issues
              <span className="nav-badge badge-danger ml-auto">{openIssues}</span>
            </Link>
            <Link to="/dashboard/owner/policy" className="btn btn-secondary btn-start">
              <Icon className="material-icons icon-18">description</Icon> Review Policy
            </Link>
            <Link to="/dashboard/owner/notifications" className="btn btn-secondary btn-start">
              <Icon className="material-icons icon-18">notifications</Icon> Notifications
              <span className="nav-badge ml-auto">{unreadNotifs}</span>
            </Link>
            <Link to="/dashboard/owner/profile" className="btn btn-secondary btn-start">
              <Icon className="material-icons icon-18">person</Icon> Update Profile
            </Link>
          </div>

          <div className="monthly-summary-box">
            <div className="monthly-summary-title">
              <Icon className="material-icons icon-16 icon-middle">bar_chart</Icon> Monthly Summary
            </div>
            <div className="monthly-summary-row">
              <span>Occupied Rooms</span>
              <strong>{occupiedRooms}</strong>
            </div>
            <div className="monthly-summary-row">
              <span>Vacant Rooms</span>
              <strong>{totalRooms - occupiedRooms}</strong>
            </div>
            <div className="monthly-summary-row-last">
              <span>Est. Revenue</span>
              <strong className="text-primary-cost">{formatCurrency(monthlyRevenue)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
