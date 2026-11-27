import { useSelector } from 'react-redux';
import useScreenState from '../../../app/useScreenState';
import StatCard from '../components/StatCard';
import { selectSubscriptions, selectSubscriptionSummary } from '../../../features/subscriptions/subscriptionReportSlice';
import useSubscriptionReport from '../../../features/subscriptions/useSubscriptionReport';
import { formatINR } from '../../../utils/normalize';
import { formatSubscriptionAmount } from '../../../utils/revenue';

export default function GlobalReports({ data }) {
  const { data: subscriptionReport, error } = useSubscriptionReport();
  const subscriptions = useSelector(selectSubscriptions);
  const { totalRevenue } = useSelector(selectSubscriptionSummary);
  const [search, setSearch] = useScreenState('');
  const { properties } = data;
  const plans = new Map(subscriptions.map((row) => [String(row.ownerId), row]));
  const ownerIdOf = (property) => String(property.ownerId ?? property.owner?.id ?? '');
  const ownerEmailOf = (property) => plans.get(ownerIdOf(property))?.ownerEmail || property.owner?.email;
  const filtered = properties.filter(property => {
    return [property.name, ownerEmailOf(property), property.location || property.region].some(value =>
      String(value || '').toLowerCase().includes(search.toLowerCase())
    );
  });
  const countedOwners = new Set();

  return <section id="global-reports-sec" className="section active">
    <div className="sec-hdr"><h2>Global Platform Reports</h2><p>Properties and recorded subscription payments</p></div>
    <div className="pay-summary">
      <StatCard icon="business" color="blue" value={properties.length} label="Total Properties" />
      <StatCard icon="check_circle" color="green" value={properties.filter(property => ['verified', 'approved'].includes(property.status)).length} label="Active Properties" />
      <StatCard icon="pending_actions" color="yellow" value={properties.filter(property => property.status === 'pending').length} label="Pending Approval" valueStyle={{ color: '#d97706' }} />
      <StatCard icon="monetization_on" color="purple" value={totalRevenue === null ? '—' : formatINR(totalRevenue)} label="Subscription Revenue" />
    </div>
    {error && <p role="alert">Could not load subscription revenue. {error}</p>}
    {subscriptionReport?.ledgerAvailable === false && <p>Subscription payment ledger unavailable.</p>}
    <div className="tbl-wrap"><div className="tbl-hdr"><div className="search-wrap"><span className="s-ico"><span className="material-icons-outlined" style={{ fontSize: 24 }}>search</span></span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by property, owner, or region..." /></div></div>
      <table className="data-tbl"><thead><tr><th>Property Name</th><th>Owner Email</th><th>Region</th><th>Status</th><th>Subscription Plan</th><th className="ta-right">Configured Fee</th></tr></thead>
        <tbody>{filtered.length ? filtered.map(property => {
          const ownerId = ownerIdOf(property);
          const plan = plans.get(ownerId);
          const isFirst = !countedOwners.has(ownerId);
          countedOwners.add(ownerId);
          const active = ['verified', 'approved'].includes(property.status);
          return <tr key={property.id || property.name}>
            <td style={{ padding: '16px 20px' }}><strong>{property.name}</strong></td>
            <td style={{ padding: '16px 20px' }}>{ownerEmailOf(property) || 'Unknown'}</td>
            <td style={{ padding: '16px 20px' }}>{property.location || property.region || 'Unknown'}</td>
            <td style={{ padding: '16px 20px' }}><span style={{ background: active ? '#dcfce7' : '#fef3c7', color: active ? '#16a34a' : '#d97706', padding: '4px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{String(property.status || 'pending').toUpperCase()}</span></td>
            <td style={{ padding: '16px 20px' }}>{plan?.planName || (subscriptionReport ? 'Not assigned' : '—')}</td>
            <td className="ta-right" style={{ padding: '16px 20px' }}><strong>{plan ? isFirst ? formatSubscriptionAmount(plan) : 'Included' : '—'}</strong></td>
          </tr>;
        }) : <tr><td colSpan="6" className="ta-center" style={{ padding: 40, color: '#94a3b8' }}>No properties found.</td></tr>}</tbody>
      </table>
    </div>
  </section>;
}
