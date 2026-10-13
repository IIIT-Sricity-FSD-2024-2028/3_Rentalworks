import StatCard from '../components/StatCard';
import { money, ownerFor, readList } from '../services/data';

export default function Dashboard({ data }) {
  const { users, properties, payments } = data;
  const admins = users.filter(user => user.role === 'admin').length;
  const verified = properties.filter(property => property.status !== 'pending').length;
  const pending = properties.filter(property => property.status === 'pending').length;
  const owners = readList('registered_owners');
  const seen = new Set();
  const subscriptionRevenue = properties.reduce((sum, property) => {
    const owner = ownerFor(property, users, owners);
    if (seen.has(owner.key)) return sum;
    seen.add(owner.key);
    return sum + owner.revenue;
  }, 0);
  const commissionRevenue = payments.filter(payment => payment.status === 'verified').reduce(
    (sum, payment) => sum + Number(payment.platformFee || Math.round(Number(payment.amount || 0) * 0.1)), 0
  );
  const totalRevenue = subscriptionRevenue + commissionRevenue;
  const revenuePoints = [0.4, 0.5, 0.65, 0.75, 0.9, 1].map(factor => Math.round(totalRevenue * factor) || 10000);
  const maxRevenue = Math.max(...revenuePoints, 1000);
  const chartPoints = revenuePoints.map((value, index) => `${10 + index * 56},${110 - value / maxRevenue * 100}`).join(' ');
  const pgBars = [0.2, 0.4, 0.5, 0.7, 0.9, 1].map(factor => Math.round(verified * factor) || 2);

  return <section id="dashboard-sec" className="section active">
    <div className="sec-hdr"><h2>Super Admin Dashboard</h2><p>Global revenue oversight and platform growth</p></div>
    <div className="stats-row stats-row-6">
      <StatCard icon="admin_panel_settings" color="blue" value={admins} label="Regional Admins" trend="↑ Live" />
      <StatCard icon="apartment" color="purple" value={verified} label="Verified PGs" trend="↑ Live" />
      <StatCard icon="payments" color="green" value={money(subscriptionRevenue)} label="Subscriptions Revenue" />
      <StatCard icon="account_balance_wallet" color="yellow" value={money(commissionRevenue)} label="Commissions Revenue" />
      <StatCard icon="monetization_on" color="green" value={money(totalRevenue)} label="Total Platform Revenue" trend="↑ 12%" />
      <StatCard icon="pending_actions" color="purple" value={pending} label="Pending PG Approvals" />
    </div>
    <div className="charts-row">
      <div className="chart-card">
        <h3>Revenue Growth</h3><p>Monthly platform revenue (Subscriptions + Commissions)</p>
        <div className="line-chart-wrap">
          <svg viewBox="0 0 300 120" style={{ width: '100%', height: '100%' }}>
            <defs><linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" /><stop offset="100%" stopColor="#22c55e" stopOpacity="0.03" /></linearGradient></defs>
            <polygon points={`${chartPoints} 290,110 10,110`} fill="url(#revenueGradient)" />
            <polyline points={chartPoints} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {revenuePoints.map((value, index) => <circle key={index} cx={10 + index * 56} cy={110 - value / maxRevenue * 100} r="3.5" fill="white" stroke="#22c55e" strokeWidth="2"><title>{money(value)}</title></circle>)}
          </svg>
        </div>
        <div className="chart-labels">{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map(month => <span key={month}>{month}</span>)}</div>
      </div>
      <div className="chart-card">
        <h3>PG Onboarding Trends</h3><p>Monthly new PG additions</p>
        <div className="chart-area">{pgBars.map((value, index) => <div key={index} className="chart-bar" style={{ height: `${value / Math.max(...pgBars, 5) * 100}%`, background: '#2563eb', margin: '0 3px' }} title={`${value} PGs`}><span className="bar-tip">{value}</span></div>)}</div>
        <div className="chart-labels">{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map(month => <span key={month}>{month}</span>)}</div>
      </div>
    </div>
  </section>;
}
