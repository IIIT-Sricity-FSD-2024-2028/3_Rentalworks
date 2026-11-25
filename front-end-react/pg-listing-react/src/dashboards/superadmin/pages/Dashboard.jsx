import StatCard from '../components/StatCard';
import { money, ownerFor } from '../services/data';

export default function Dashboard({ data }) {
  const { users, properties, payments } = data;
  const admins = users.filter(user => user.role === 'admin').length;
  const verified = properties.filter(property => ['verified', 'approved'].includes(property.status)).length;
  const pending = properties.filter(property => property.status === 'pending').length;
  const seen = new Set();
  const subscriptionRevenue = properties.reduce((sum, property) => {
    const owner = ownerFor(property);
    if (seen.has(owner.key)) return sum;
    seen.add(owner.key);
    return sum + owner.fee;
  }, 0);
  const commissionRevenue = payments.filter(payment => payment.status === 'verified').reduce(
    (sum, payment) => sum + Number(payment.platformFee || 0), 0
  );
  const totalRevenue = subscriptionRevenue + commissionRevenue;
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - 5 + index);
    return date;
  });
  const revenuePoints = months.map(month => payments.filter(payment => {
    const date = new Date(payment.paidDate);
    return payment.status === 'verified' && date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth();
  }).reduce((sum, payment) => sum + Number(payment.platformFee || 0), 0));
  const maxRevenue = Math.max(1, Math.max.apply(null, revenuePoints));
  const chartPoints = revenuePoints.map((value, index) => `${10 + index * 56},${110 - value / maxRevenue * 100}`).join(' ');
  const pgBars = months.map(month => properties.filter(property => {
    const date = new Date(property.createdAt);
    return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth();
  }).length);

  return <section id="dashboard-sec" className="section active">
    <div className="sec-hdr"><h2>Super Admin Dashboard</h2><p>Global revenue oversight and platform growth</p></div>
    <div className="stats-row stats-row-6">
      <StatCard icon="admin_panel_settings" color="blue" value={admins} label="Regional Admins" />
      <StatCard icon="apartment" color="purple" value={verified} label="Verified PGs" />
      <StatCard icon="payments" color="green" value={money(subscriptionRevenue)} label="Configured Subscription Fees" />
      <StatCard icon="account_balance_wallet" color="yellow" value={money(commissionRevenue)} label="Commissions Revenue" />
      <StatCard icon="monetization_on" color="green" value={money(totalRevenue)} label="Fees + Verified Commissions" />
      <StatCard icon="pending_actions" color="purple" value={pending} label="Pending PG Approvals" />
    </div>
    <div className="charts-row">
      <div className="chart-card">
        <h3>Revenue Growth</h3><p>Monthly verified commissions</p>
        <div className="line-chart-wrap">
          <svg viewBox="0 0 300 120" style={{ width: '100%', height: '100%' }}>
            <defs><linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" /><stop offset="100%" stopColor="#22c55e" stopOpacity="0.03" /></linearGradient></defs>
            <polygon points={`${chartPoints} 290,110 10,110`} fill="url(#revenueGradient)" />
            <polyline points={chartPoints} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {revenuePoints.map((value, index) => <circle key={index} cx={10 + index * 56} cy={110 - value / maxRevenue * 100} r="3.5" fill="white" stroke="#22c55e" strokeWidth="2"><title>{money(value)}</title></circle>)}
          </svg>
        </div>
        <div className="chart-labels">{months.map(month => <span key={month.toISOString()}>{month.toLocaleString('en-IN', { month: 'short' })}</span>)}</div>
      </div>
      <div className="chart-card">
        <h3>PG Onboarding Trends</h3><p>Monthly new PG additions</p>
        <div className="chart-area">{pgBars.map((value, index) => <div key={index} className="chart-bar" style={{ height: `${value / Math.max(1, Math.max.apply(null, pgBars)) * 100}%`, background: '#2563eb', margin: '0 3px' }} title={`${value} PGs`}><span className="bar-tip">{value}</span></div>)}</div>
        <div className="chart-labels">{months.map(month => <span key={month.toISOString()}>{month.toLocaleString('en-IN', { month: 'short' })}</span>)}</div>
      </div>
    </div>
  </section>;
}
