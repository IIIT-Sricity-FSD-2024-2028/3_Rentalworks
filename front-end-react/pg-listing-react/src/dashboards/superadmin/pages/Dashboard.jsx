import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/StatCard';
import { selectSubscriptionSummary, selectSubscriptions } from '../../../features/subscriptions/subscriptionReportSlice';
import { fetchSuperAdminBookings, selectSuperAdminBookings } from '../../../features/superadmin/superAdminSlice';
import { Pill } from '../components/controls';
import { ROLE_LABEL, ROLE_TONE, daysUntil } from '../components/controlUtils';
import { normalizeStatus } from '../../../utils/normalize';
import useSubscriptionReport from '../../../features/subscriptions/useSubscriptionReport';
import { lastMonths, monthKey } from '../../../utils/months';
import { formatINR } from '../../../utils/normalize';
import { monthlyPlatformRevenue, recordedCommissions, sumMoney } from '../../../utils/revenue';

export default function Dashboard({ data }) {
  const { data: subscriptionReport, error } = useSubscriptionReport();
  const { totalRevenue: subscriptionRevenue, payments: subscriptionPayments } = useSelector(selectSubscriptionSummary);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const subscriptions = useSelector(selectSubscriptions);
  const bookings = useSelector(selectSuperAdminBookings);
  useEffect(() => {
    dispatch(fetchSuperAdminBookings());
  }, [dispatch]);
  const { users, properties, payments } = data;
  const admins = users.filter(user => user.role === 'admin').length;
  const verified = properties.filter(property => ['verified', 'approved'].includes(property.status)).length;
  const pending = properties.filter(property => property.status === 'pending').length;
  const commissions = recordedCommissions(payments);
  const commissionRevenue = sumMoney(commissions, (payment) => payment.platformFee);
  const totalRevenue = subscriptionRevenue === null ? null : subscriptionRevenue + commissionRevenue;
  const months = lastMonths(6);
  const revenuePoints = monthlyPlatformRevenue(months, commissions, subscriptionPayments);
  const maxRevenue = Math.max(1, Math.max.apply(null, revenuePoints));
  const chartPoints = revenuePoints.map((value, index) => `${10 + index * 56},${110 - value / maxRevenue * 100}`).join(' ');
  const pgBars = months.map(({ key }) => properties.filter(property => monthKey(property.createdAt) === key).length);

  return <section id="dashboard-sec" className="section active">
    <div className="sec-hdr"><h2>Super Admin Dashboard</h2><p>Global revenue oversight and platform growth</p></div>
    <div className="stats-row stats-row-6">
      <StatCard icon="admin_panel_settings" color="blue" value={admins} label="Regional Admins" />
      <StatCard icon="apartment" color="purple" value={verified} label="Verified PGs" />
      <StatCard icon="payments" color="green" value={subscriptionRevenue === null ? '—' : formatINR(subscriptionRevenue)} label="Subscription Revenue" />
      <StatCard icon="account_balance_wallet" color="yellow" value={formatINR(commissionRevenue)} label="Recorded Platform Fees" />
      <StatCard icon="monetization_on" color="green" value={totalRevenue === null ? '—' : formatINR(totalRevenue)} label="Platform Revenue" />
      <StatCard icon="pending_actions" color="purple" value={pending} label="Pending PG Approvals" />
    </div>
    {error && <p role="alert">Could not load subscription revenue. {error}</p>}
    <Attention items={attentionItems({ users, properties, payments, subscriptions, bookings })} onOpen={navigate} />
    <RoleBreakdown users={users} onOpen={() => navigate('/dashboard/superadmin/users')} />
    {subscriptionReport?.ledgerAvailable === false && <p>Subscription payment ledger unavailable.</p>}
    <div className="charts-row">
      <div className="chart-card">
        <h3>Revenue Growth</h3><p>{subscriptionRevenue === null ? 'Monthly recorded platform fees' : 'Monthly subscription payments and platform fees'}</p>
        <div className="line-chart-wrap">
          <svg viewBox="0 0 300 120" style={{ width: '100%', height: '100%' }}>
            <defs><linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" /><stop offset="100%" stopColor="#22c55e" stopOpacity="0.03" /></linearGradient></defs>
            <polygon points={`${chartPoints} 290,110 10,110`} fill="url(#revenueGradient)" />
            <polyline points={chartPoints} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {revenuePoints.map((value, index) => <circle key={index} cx={10 + index * 56} cy={110 - value / maxRevenue * 100} r="3.5" fill="white" stroke="#22c55e" strokeWidth="2"><title>{formatINR(value)}</title></circle>)}
          </svg>
        </div>
        <div className="chart-labels">{months.map(({ key, label }) => <span key={key}>{label}</span>)}</div>
      </div>
      <div className="chart-card">
        <h3>PG Onboarding Trends</h3><p>Monthly new PG additions</p>
        <div className="chart-area">{pgBars.map((value, index) => <div key={index} className="chart-bar" style={{ height: `${value / Math.max(1, Math.max.apply(null, pgBars)) * 100}%`, background: '#2563eb', margin: '0 3px' }} title={`${value} PGs`}><span className="bar-tip">{value}</span></div>)}</div>
        <div className="chart-labels">{months.map(({ key, label }) => <span key={key}>{label}</span>)}</div>
      </div>
    </div>
  </section>;
}

const BASE = '/dashboard/superadmin';

/** Everything that needs the super admin's decision, each linking to its page. */
function attentionItems({ users, properties, payments, subscriptions, bookings }) {
  const st = (v) => normalizeStatus(v);
  const owners = users.filter((u) => u.role === 'owner');
  const ownersWithLivePg = new Set(properties.filter((p) => ['verified', 'approved'].includes(p.status)).map((p) => String(p.ownerId ?? p.owner?.id)));
  const covered = new Set(subscriptions.filter((s) => s.status === 'ACTIVE').map((s) => String(s.ownerId)));
  return [
    { icon: 'apartment', tone: 'amber', count: properties.filter((p) => p.status === 'pending').length, label: 'PGs waiting for approval', hint: 'Regional admins review these', to: `${BASE}/global-reports` },
    { icon: 'how_to_reg', tone: 'amber', count: owners.filter((u) => st(u.status) === 'pending').length, label: 'Owner accounts pending', hint: 'Activate or keep on hold', to: `${BASE}/users` },
    { icon: 'event_busy', tone: 'red', count: subscriptions.filter((s) => s.status === 'EXPIRED' || (s.status === 'ACTIVE' && (daysUntil(s.endDate) ?? 999) <= 30)).length, label: 'Plans expiring or expired', hint: 'Within 30 days or already ended', to: `${BASE}/subscriptions` },
    { icon: 'warning', tone: 'red', count: owners.filter((o) => ownersWithLivePg.has(String(o.id)) && !covered.has(String(o.id))).length, label: 'Live PGs without a plan', hint: 'Owner has no active subscription', to: `${BASE}/subscriptions` },
    { icon: 'report', tone: 'red', count: payments.filter((p) => ['failed', 'disputed'].includes(st(p.status))).length, label: 'Failed / disputed payments', hint: 'Check and correct the record', to: `${BASE}/payments` },
    { icon: 'hourglass_top', tone: 'amber', count: payments.filter((p) => ['pending', 'processing'].includes(st(p.status))).length + bookings.filter((b) => st(b.status) === 'pending').length, label: 'Pending payments & bookings', hint: 'Not confirmed yet', to: `${BASE}/payments` },
    { icon: 'block', tone: 'slate', count: users.filter((u) => st(u.status) === 'suspended').length, label: 'Suspended accounts', hint: 'Re-activate when resolved', to: `${BASE}/users` },
    { icon: 'admin_panel_settings', tone: 'slate', count: users.filter((u) => u.role === 'admin' && st(u.status) !== 'active').length, label: 'Inactive admins', hint: 'Regions may be unmanaged', to: `${BASE}/regional-admins` },
  ];
}

function Attention({ items, onOpen }) {
  const colors = { amber: '#b45309', red: '#b91c1c', slate: '#475569' };
  return <div className="chart-card" style={{ marginBottom: 20 }}>
    <h3>Needs attention</h3><p>Open items across admins, owners, tenants and payments</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginTop: 12 }}>
      {items.map((it) => (
        <button key={it.label} type="button" onClick={() => onOpen(it.to)}
          style={{ display: 'flex', gap: 10, alignItems: 'center', textAlign: 'left', padding: 12, borderRadius: 10, cursor: 'pointer',
            border: `1px solid ${it.count ? '#fde68a' : '#e2e8f0'}`, background: it.count ? '#fffbeb' : 'white' }}>
          <span className="material-icons-outlined" style={{ fontSize: 22, color: it.count ? colors[it.tone] : '#94a3b8' }}>{it.icon}</span>
          <span style={{ flex: 1 }}>
            <strong style={{ display: 'block', fontSize: 12, color: '#0f172a' }}>{it.label}</strong>
            <span style={{ fontSize: 11, color: '#64748b' }}>{it.hint}</span>
          </span>
          <strong style={{ fontSize: 20, color: it.count ? colors[it.tone] : '#94a3b8' }}>{it.count}</strong>
        </button>
      ))}
    </div>
  </div>;
}

function RoleBreakdown({ users, onOpen }) {
  const roles = ['admin', 'owner', 'warden', 'tenant', 'guest'];
  const total = Math.max(1, users.filter((u) => roles.includes(u.role)).length);
  return <div className="chart-card" style={{ marginBottom: 20 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div><h3>Users by role</h3><p>Active vs other accounts across the platform</p></div>
      <button type="button" className="btn-cancel" onClick={onOpen}>Manage users</button>
    </div>
    <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
      {roles.map((r) => {
        const list = users.filter((u) => u.role === r);
        const active = list.filter((u) => normalizeStatus(u.status) === 'active').length;
        return <div key={r} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 150px', alignItems: 'center', gap: 10, fontSize: 12 }}>
          <Pill tone={ROLE_TONE[r]}>{ROLE_LABEL[r]}s</Pill>
          <div style={{ background: '#f1f5f9', borderRadius: 99, height: 10, overflow: 'hidden' }}>
            <div style={{ width: `${(list.length / total) * 100}%`, height: '100%', background: '#2563eb', borderRadius: 99 }} />
          </div>
          <span style={{ textAlign: 'right', color: '#475569' }}><strong>{list.length}</strong> · {active} active{list.length - active ? ` · ${list.length - active} other` : ''}</span>
        </div>;
      })}
    </div>
  </div>;
}
