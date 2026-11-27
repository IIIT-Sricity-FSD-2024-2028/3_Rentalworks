import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  adminBookings,
  adminComplaints,
  adminPayments,
  adminProperties,
  adminUsers,
  selectAdminSubscriptionStats,
} from '../../../features/admin/adminSlices';
import { lastMonths, monthKey } from '../utils/months';

const LIVE = ['active', 'confirmed', 'paid'];
const PAID = ['verified', 'completed', 'success'];
const nameOf = (v) => (typeof v === 'object' ? v?.name : v) || 'Unknown';
const sum = (list) => list.reduce((t, p) => t + (Number(p.amount) || 0), 0);

function timeAgo(value) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} h ago`;
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const users = useSelector(adminUsers.selectors.selectItems);
  const properties = useSelector(adminProperties.selectors.selectItems);
  const bookings = useSelector(adminBookings.selectors.selectItems);
  const payments = useSelector(adminPayments.selectors.selectItems);
  const complaints = useSelector(adminComplaints.selectors.selectItems);
  const subs = useSelector(selectAdminSubscriptionStats);
  const lastSync = useSelector((s) => s.payments.lastFetched);
  const loadError = useSelector((s) => [s.users, s.properties, s.bookings, s.payments].find((x) => x.error)?.error);

  useEffect(() => {
    [adminUsers, adminProperties, adminBookings, adminPayments, adminComplaints].forEach((r) => dispatch(r.thunks.fetchAll()));
  }, [dispatch]);

  const paidPayments = payments.filter((p) => PAID.includes(p.status));
  const gtv = sum(paidPayments);
  const stats = {
    users: users.length,
    properties: properties.length,
    activeBookings: bookings.filter((b) => LIVE.includes(b.status)).length,
    pendingBookings: bookings.filter((b) => b.status === 'pending').length,
    gtv,
    platformRev: Math.round(gtv * 0.1) + subs.payments.totalRevenue,
  };
  const health = {
    pendingProps: properties.filter((p) => p.status === 'pending').length,
    pendingPayments: payments.filter((p) => p.status === 'pending').length,
    overdueBookings: bookings.filter((b) => b.status === 'overdue').length,
  };

  const fmtK = (n) => (n >= 1000 ? '₹' + (n / 1000).toFixed(1) + 'K' : '₹' + n.toLocaleString('en-IN'));

  // Last six months, from real payments and bookings.
  const months = lastMonths(6);
  const revenueData = months.map((m) => Math.round(0.1 * sum(paidPayments.filter((p) => monthKey(p.paidDate || p.createdAt) === m.key))));
  const bookingData = months.map((m) => bookings.filter((b) => monthKey(b.createdAt || b.checkIn) === m.key).length);
  const revenueMax = Math.max(...revenueData, 1);
  const bookingMax = Math.max(...bookingData, 1);

  const w = 300, h = 120, pad = 10;
  const revPts = revenueData.map((v, i) => `${pad + (i / (revenueData.length - 1)) * (w - pad * 2)},${h - pad - ((v / revenueMax) * (h - pad * 2))}`).join(' ');
  const revArea = `${pad + (w - pad * 2)},${h - pad} ${pad},${h - pad}`;

  const feed = [
    ...bookings.map((b) => ({ at: b.createdAt, icon: b.status === 'cancelled' ? '❌' : '📅', action: b.status === 'cancelled' ? 'cancelled a booking' : `booked Room ${b.room || '—'}`, person: nameOf(b.tenant), property: nameOf(b.property) })),
    ...payments.map((p) => ({ at: p.createdAt || p.paidDate, icon: '💰', action: `paid ₹${Number(p.amount || 0).toLocaleString('en-IN')}`, person: nameOf(p.tenant), property: nameOf(p.property) })),
    ...complaints.map((c) => ({ at: c.createdAt || c.reportedAt, icon: '⚠️', action: 'raised a complaint', person: nameOf(c.tenant), property: nameOf(c.property) })),
  ]
    .filter((a) => a.at && !Number.isNaN(new Date(a.at).getTime()))
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 6);

  return (
    <>
      <div className="sec-hdr">
        <h2>Dashboard Overview</h2>
        <p>Monitor platform statistics and system health</p>
      </div>

      {/* 6 KPI Cards */}
      <div className="stats-row stats-row-6">
        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon bg-blue">
              <span className="material-icons-outlined" style={{ fontSize: 32, color: '#2563eb' }}>group</span>
            </div>
            <span className="stat-trend up">↑ Live</span>
          </div>
          <div className="stat-val">{stats.users.toLocaleString()}</div>
          <div className="stat-lbl">Total Users</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon bg-purple">
              <span className="material-icons-outlined" style={{ fontSize: 32, color: '#7c3aed' }}>apartment</span>
            </div>
            <span className="stat-trend up">↑ Live</span>
          </div>
          <div className="stat-val">{stats.properties}</div>
          <div className="stat-lbl">Total PG Properties</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon bg-green">
              <span className="material-icons-outlined" style={{ fontSize: 32, color: '#16a34a' }}>calendar_today</span>
            </div>
          </div>
          <div className="stat-val">{stats.activeBookings}</div>
          <div className="stat-lbl">Active Bookings</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon bg-yellow" style={{ fontSize: 20 }}>⏳</div>
          </div>
          <div className="stat-val">{stats.pendingBookings}</div>
          <div className="stat-lbl">Pending Bookings</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon bg-green">
              <span className="material-icons-outlined" style={{ fontSize: 32, color: '#16a34a' }}>payments</span>
            </div>
          </div>
          <div className="stat-val">{fmtK(stats.gtv)}</div>
          <div className="stat-lbl">Gross Transaction Value</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon bg-purple">
              <span className="material-icons-outlined" style={{ fontSize: 32, color: '#7c3aed' }}>payments</span>
            </div>
            <span className="stat-trend up">10%</span>
          </div>
          <div className="stat-val">{fmtK(stats.platformRev)}</div>
          <div className="stat-lbl">Platform Revenue</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        <div className="chart-card">
          <h3>Revenue Overview</h3>
          <p>Monthly revenue trends</p>
          <div className="line-chart-wrap">
            <svg viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0.03" />
                </linearGradient>
              </defs>
              <polygon points={`${revPts} ${revArea}`} fill="url(#rg)" />
              <polyline points={revPts} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              {revenueData.map((v, i) => {
                const cx = pad + (i / (revenueData.length - 1)) * (w - pad * 2);
                const cy = h - pad - ((v / revenueMax) * (h - pad * 2));
                return (
                  <circle key={i} cx={cx} cy={cy} r="3.5" fill="white" stroke="#22c55e" strokeWidth="2">
                    <title>₹{v.toLocaleString()}</title>
                  </circle>
                );
              })}
            </svg>
          </div>
          <div className="chart-labels">
            {months.map((m) => <span key={m.key}>{m.label}</span>)}
          </div>
        </div>

        <div className="chart-card">
          <h3>Booking Trends</h3>
          <p>Monthly booking statistics</p>
          <div className="chart-area">
            {bookingData.map((v, i) => (
              <div
                key={i}
                className="chart-bar"
                style={{ height: `${(v / bookingMax) * 100}%`, background: '#2563eb', margin: '0 3px' }}
                title={`${v} bookings`}
              >
                <span className="bar-tip">{v}</span>
              </div>
            ))}
          </div>
          <div className="chart-labels">
            {months.map((m) => <span key={m.key}>{m.label}</span>)}
          </div>
        </div>
      </div>

      {/* Activity Feed + System Health */}
      <div className="dashboard-bottom-row">
        <div className="activity-card">
          <div className="activity-hdr">
            <span>〰️</span>
            <div>
              <h3>Recent Activity Feed</h3>
              <p>Action · Person · Property · Time</p>
            </div>
          </div>
          <div id="activity-feed">
            {feed.length === 0 && <p style={{ padding: 16, color: '#94a3b8', fontSize: 13 }}>No recent activity</p>}
            {feed.map((a, i) => (
              <div key={i} className="feed-item">
                <div className="feed-ico-wrap">{a.icon}</div>
                <div className="feed-text">
                  <strong>{a.person}</strong> {a.action} at <strong>{a.property}</strong>
                </div>
                <div className="feed-time">{timeAgo(a.at)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="system-health-card">
          <h3>System Health</h3>
          <p>Live platform status</p>
          <div>
            <div className="health-item">
              <span className={`health-dot ${health.pendingProps > 0 ? 'warn' : 'ok'}`} />
              <span className="health-label">Pending Property Approvals</span>
              <strong>{health.pendingProps}</strong>
            </div>
            <div className="health-item">
              <span className={`health-dot ${health.pendingPayments > 0 ? 'warn' : 'ok'}`} />
              <span className="health-label">Payments Awaiting Verification</span>
              <strong>{health.pendingPayments}</strong>
            </div>
            <div className="health-item">
              <span className={`health-dot ${health.overdueBookings > 0 ? 'danger' : 'ok'}`} />
              <span className="health-label">Overdue Bookings</span>
              <strong>{health.overdueBookings}</strong>
            </div>
            <div className="health-item">
              <span className={`health-dot ${loadError ? 'danger' : 'ok'}`} />
              <span className="health-label">System Status</span>
              <strong style={{ color: loadError ? '#dc2626' : '#16a34a' }}>{loadError || 'Operational'}</strong>
            </div>
            <div className="health-item">
              <span className="health-dot ok" />
              <span className="health-label">Last Data Sync</span>
              <strong>{lastSync ? new Date(lastSync).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-card">
        <h3>Quick Actions</h3>
        <div className="qa-grid">
          <button className="qa-btn" onClick={() => navigate('/dashboard/admin/properties')}>
            <span className="qa-icon">
              <span className="material-icons-outlined" style={{ fontSize: 24, color: '#2563eb' }}>apartment</span>
            </span>
            <div>
              <strong>Pending Approvals</strong>
              <span>{health.pendingProps} properties waiting</span>
            </div>
          </button>

          <button className="qa-btn" onClick={() => navigate('/dashboard/admin/payments')}>
            <span className="qa-icon">
              <span className="material-icons-outlined" style={{ fontSize: 24, color: '#7c3aed' }}>credit_card</span>
            </span>
            <div>
              <strong>Verify Payments</strong>
              <span>{health.pendingPayments} pending verification</span>
            </div>
          </button>

          <button className="qa-btn" onClick={() => navigate('/dashboard/admin/bookings')}>
            <span className="qa-icon">
              <span className="material-icons-outlined" style={{ fontSize: 24, color: '#16a34a' }}>calendar_today</span>
            </span>
            <div>
              <strong>Confirm Bookings</strong>
              <span>{stats.pendingBookings} bookings pending</span>
            </div>
          </button>

          <button className="qa-btn" onClick={() => navigate('/dashboard/admin/users')}>
            <span className="qa-icon">
              <span className="material-icons-outlined" style={{ fontSize: 24, color: '#ea580c' }}>group</span>
            </span>
            <div>
              <strong>Manage Users</strong>
              <span>Add, edit or suspend accounts</span>
            </div>
          </button>
        </div>
      </div>
    </>
  );
}
