import { useState } from 'react';
import { api } from '../services/api';
import StatCard from '../components/StatCard';

export default function RegionalAdmins({ users, refresh, showToast }) {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', region: '', phone: '', password: '' });
  const [saving, setSaving] = useState(false);
  const admins = users.filter(user => user.role === 'admin');
  const filtered = admins.filter(admin => [admin.name, admin.email, admin.region].some(value =>
    String(value || '').toLowerCase().includes(search.toLowerCase())
  ));

  function openAdd() { setForm({ name: '', email: '', region: '', phone: '', password: '' }); setEditing('new'); }
  function openEdit(admin) { setForm({ name: admin.name, email: admin.email, region: admin.region || '', phone: admin.phone || '', password: '' }); setEditing(admin); }

  async function save() {
    if (form.region.trim().length < 2) {
      showToast('error', 'Validation', 'Enter a region with at least 2 characters.'); return;
    }
    if (editing === 'new') {
      if (form.name.trim().length < 2) {
        showToast('error', 'Validation', 'Enter a name with at least 2 characters.'); return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        showToast('error', 'Validation', 'Enter a valid email address, such as sanjay@example.com.'); return;
      }
      if (!/^\+?[\d\s-]{9,}$/.test(form.phone.trim())) {
        showToast('error', 'Validation', 'Enter a valid phone number.'); return;
      }
      if (form.password.length < 6) {
        showToast('error', 'Validation', 'Password must have at least 6 characters.'); return;
      }
    }
    setSaving(true);
    try {
      if (editing === 'new') {
        await api.createAdmin({ name: form.name.trim(), email: form.email.trim(), region: form.region.trim(), phone: form.phone.trim(), password: form.password });
      } else {
        await api.updateAdmin(editing.id, { region: form.region.trim() });
      }
      await refresh();
      setEditing(null);
      showToast('success', editing === 'new' ? 'Admin Added' : 'Admin Updated', editing === 'new' ? 'Admin signs in with their email and chosen password.' : 'Regional admin saved successfully.');
    } catch (error) { showToast('error', 'Error', error.message); }
    finally { setSaving(false); }
  }

  return <section id="regional-admins-sec" className="section active">
    <div className="sec-hdr"><h2>Regional Admins</h2><p>Manage administrative accounts and their assigned regions</p>
      <div className="hdr-actions"><button className="btn-confirm-blue" style={{ marginTop: 12, padding: '10px 16px', borderRadius: 6, fontWeight: 600 }} onClick={openAdd}>+ Add Regional Admin</button></div>
    </div>
    <div className="pay-summary">
      <StatCard icon="supervisor_account" color="blue" value={admins.length} label="Total Admins" />
      <StatCard icon="map" color="green" value={new Set(admins.map(admin => admin.region).filter(Boolean)).size} label="Active Regions" />
      <StatCard icon="verified_user" color="purple" value={admins.filter(admin => admin.status === 'active').length} label="Active Accounts" />
    </div>
    <div className="tbl-wrap"><div className="tbl-hdr"><div className="search-wrap"><span className="s-ico"><span className="material-icons-outlined" style={{ fontSize: 24 }}>search</span></span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by name, email, or region..." /></div></div>
      <table className="data-tbl"><thead><tr><th>Name</th><th>Email</th><th>Assigned Region</th><th>Status</th><th className="ta-right">Actions</th></tr></thead>
        <tbody>{filtered.length ? filtered.map(admin => <tr key={admin.id || admin.email}>
          <td style={{ padding: '16px 20px' }}><strong>{admin.name}</strong></td><td style={{ padding: '16px 20px' }}>{admin.email}</td>
          <td style={{ padding: '16px 20px' }}><span style={{ background: '#e0e7ff', color: '#4338ca', padding: '4px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{admin.region || 'Unassigned'}</span></td>
          <td style={{ padding: '16px 20px' }}><span style={{ background: '#dcfce7', color: '#16a34a', padding: '4px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{admin.status || 'Unknown'}</span></td>
          <td className="ta-right" style={{ padding: '16px 20px' }}><button className="btn-cancel" style={{ padding: '6px 12px', borderRadius: 6 }} onClick={() => openEdit(admin)}>Edit</button></td>
        </tr>) : <tr><td colSpan="5" className="ta-center" style={{ padding: 40, color: '#94a3b8' }}>No regional admins found.</td></tr>}</tbody>
      </table>
    </div>
    {editing && <div className="modal-overlay show" onClick={() => setEditing(null)}><div className="modal" onClick={event => event.stopPropagation()}>
      <div className="modal-hdr"><h3>{editing === 'new' ? 'New Admin' : 'Edit Admin'}</h3><span className="modal-close" onClick={() => setEditing(null)}>×</span></div>
      <div>{editing === 'new' && <>
        <input className="form-input" style={{ width: '100%', marginBottom: 10, padding: 8 }} placeholder="Name" value={form.name} onChange={event => setForm(Object.assign({}, form, { name: event.target.value }))} />
        <input className="form-input" style={{ width: '100%', marginBottom: 10, padding: 8 }} placeholder="Email (also the login username)" type="email" value={form.email} onChange={event => setForm({ name: form.name, email: event.target.value, region: form.region, phone: form.phone, password: form.password })} />
        <input className="form-input" style={{ width: '100%', marginBottom: 10, padding: 8 }} placeholder="Phone" value={form.phone} onChange={event => setForm({ name: form.name, email: form.email, region: form.region, phone: event.target.value, password: form.password })} />
        <input className="form-input" style={{ width: '100%', marginBottom: 10, padding: 8 }} placeholder="Password (at least 6 characters)" type="password" value={form.password} onChange={event => setForm({ name: form.name, email: form.email, region: form.region, phone: form.phone, password: event.target.value })} />
      </>}
        {editing !== 'new' && <label style={{ display: 'block', marginBottom: 5, fontSize: 12, color: '#64748b' }}>Assigned Region</label>}
        <input className="form-input" style={{ width: '100%', padding: 8 }} placeholder="Region (e.g. Bangalore)" value={form.region} onChange={event => setForm(Object.assign({}, form, { region: event.target.value }))} />
      </div>
      <div className="modal-foot"><button className="btn-cancel" onClick={() => setEditing(null)}>Cancel</button><button className="btn-confirm-blue" disabled={saving} onClick={save}>{saving ? 'Saving...' : editing === 'new' ? 'Save' : 'Save Changes'}</button></div>
    </div></div>}
  </section>;
}
