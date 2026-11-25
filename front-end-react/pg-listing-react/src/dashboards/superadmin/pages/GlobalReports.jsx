import { useState } from 'react';
import StatCard from '../components/StatCard';
import { money, ownerFor } from '../services/data';

export default function GlobalReports({ data }) {
  const [search, setSearch] = useState('');
  const { properties } = data;
  const plans = new Map();
  properties.forEach(property => {
    const owner = ownerFor(property);
    if (!plans.has(owner.key)) plans.set(owner.key, owner);
  });
  const totalRevenue = Array.from(plans.values()).reduce((sum, owner) => sum + owner.fee, 0);
  const filtered = properties.filter(property => {
    const owner = ownerFor(property);
    return [property.name, owner.email, property.location || property.region].some(value =>
      String(value || '').toLowerCase().includes(search.toLowerCase())
    );
  });
  const countedOwners = new Set();

  return <section id="global-reports-sec" className="section active">
    <div className="sec-hdr"><h2>Global Platform Reports</h2><p>Properties and configured owner subscription fees</p></div>
    <div className="pay-summary">
      <StatCard icon="business" color="blue" value={properties.length} label="Total Properties" />
      <StatCard icon="check_circle" color="green" value={properties.filter(property => ['verified', 'approved'].includes(property.status)).length} label="Active Properties" />
      <StatCard icon="pending_actions" color="yellow" value={properties.filter(property => property.status === 'pending').length} label="Pending Approval" valueStyle={{ color: '#d97706' }} />
      <StatCard icon="monetization_on" color="purple" value={money(totalRevenue)} label="Configured Subscription Fees" />
    </div>
    <div className="tbl-wrap"><div className="tbl-hdr"><div className="search-wrap"><span className="s-ico"><span className="material-icons-outlined" style={{ fontSize: 24 }}>search</span></span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by property, owner, or region..." /></div></div>
      <table className="data-tbl"><thead><tr><th>Property Name</th><th>Owner Email</th><th>Region</th><th>Status</th><th>Subscription Plan</th><th className="ta-right">Subscription Fee</th></tr></thead>
        <tbody>{filtered.length ? filtered.map(property => {
          const owner = ownerFor(property);
          const plan = plans.get(owner.key);
          const isFirst = !countedOwners.has(owner.key);
          countedOwners.add(owner.key);
          const active = ['verified', 'approved'].includes(property.status);
          return <tr key={property.id || property.name}>
            <td style={{ padding: '16px 20px' }}><strong>{property.name}</strong></td>
            <td style={{ padding: '16px 20px' }}>{owner.email}</td>
            <td style={{ padding: '16px 20px' }}>{property.location || property.region || 'Unknown'}</td>
            <td style={{ padding: '16px 20px' }}><span style={{ background: active ? '#dcfce7' : '#fef3c7', color: active ? '#16a34a' : '#d97706', padding: '4px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{String(property.status || 'pending').toUpperCase()}</span></td>
            <td style={{ padding: '16px 20px' }}>{plan?.plan || 'Not assigned'}</td>
            <td className="ta-right" style={{ padding: '16px 20px' }}><strong style={!isFirst && plan ? { color: '#64748b', fontSize: 13, fontWeight: 500 } : {}}>{plan ? isFirst ? money(plan.fee) : 'Included' : '₹0'}</strong></td>
          </tr>;
        }) : <tr><td colSpan="6" className="ta-center" style={{ padding: 40, color: '#94a3b8' }}>No properties found.</td></tr>}</tbody>
      </table>
    </div>
  </section>;
}
