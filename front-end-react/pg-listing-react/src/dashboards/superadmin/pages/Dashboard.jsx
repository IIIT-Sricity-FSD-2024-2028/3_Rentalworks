import { useSelector } from 'react-redux';
import StatCard from '../components/StatCard';
import { selectSubscriptionSummary } from '../../../features/subscriptions/subscriptionReportSlice';
import useSubscriptionReport from '../../../features/subscriptions/useSubscriptionReport';
import { lastMonths, monthKey } from '../../../utils/months';
import { formatINR } from '../../../utils/normalize';
import { monthlyPlatformRevenue, recordedCommissions, sumMoney } from '../../../utils/revenue';

export default function Dashboard({ data }) {
  const { data: subscriptionReport, error } = useSubscriptionReport();
  const { totalRevenue: subscriptionRevenue, payments: subscriptionPayments } = useSelector(selectSubscriptionSummary);
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
