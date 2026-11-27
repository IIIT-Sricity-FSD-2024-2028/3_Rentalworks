
import useScreenState from '../../../app/useScreenState';
import { useDispatch, useSelector } from 'react-redux';
import {
  createRegionalAdmin, deleteAccount, selectSuperAdminOverview, selectSuperAdminSaving, updateAccount, updateRegionalAdmin,
} from '../../../features/superadmin/superAdminSlice';
import StatCard from '../components/StatCard';
import { CopyButton, Dialog, IconAction, Pill } from '../components/controls';
import { ACCOUNT_TONE, cellStyle, generatePassword, subText } from '../components/controlUtils';
import { formatDate, normalizeStatus } from '../../../utils/normalize';

const inRegion = (property, region) => {
  const r = String(region || '').trim().toLowerCase();
  if (!r) return false;
  return [property.location, property.city, property.address].some((v) => String(v || '').toLowerCase().includes(r));
};

/**
 * Regional admins: the super admin creates them, edits their details and region,
 * suspends / re-activates them, resets their password and removes them.
 */
export default function RegionalAdmins({ users, showToast }) {
  const dispatch = useDispatch();
  const overview = useSelector(selectSuperAdminOverview);
  const saving = useSelector(selectSuperAdminSaving);
  const [search, setSearch] = useScreenState('');
  const [editing, setEditing] = useScreenState(null);
  const [form, setForm] = useScreenState({ name: '', email: '', region: '', phone: '' });
  const [password, setPassword] = useScreenState('', { secret: true });
  const [dialog, setDialog] = useScreenState(null); // { type: 'suspend'|'activate'|'reset'|'delete'|'issued', id }
  const [issued, setIssued] = useScreenState(null, { secret: true }); // new password, shown once (Redux, masked in DevTools)
  const [confirmText, setConfirmText] = useScreenState('');

  const properties = overview?.properties || [];
  const admins = users.filter((user) => user.role === 'admin');
  const filtered = admins.filter((admin) => [admin.name, admin.email, admin.region, admin.phone].some((value) =>
    String(value || '').toLowerCase().includes(search.toLowerCase()),
  ));
  const regions = [...new Set(admins.map((a) => String(a.region || '').trim().toLowerCase()).filter(Boolean))];
  const uncovered = properties.filter((p) => !regions.some((r) => inRegion(p, r)));
  const target = admins.find((a) => String(a.id) === String(dialog?.id));

  function openAdd() { setForm({ name: '', email: '', region: '', phone: '' }); setPassword(''); setEditing('new'); }
  function openEdit(admin) { setForm({ name: admin.name || '', email: admin.email || '', region: admin.region || '', phone: admin.phone || '' }); setEditing(admin.id); }
  function closeEditor() { setPassword(''); setEditing(null); }
  function closeDialog() { setDialog(null); setIssued(null); setConfirmText(''); }

  async function save() {
    if (form.region.trim().length < 2) return showToast('error', 'Validation', 'Enter a region with at least 2 characters.');
    if (form.name.trim().length < 2) return showToast('error', 'Validation', 'Enter a name with at least 2 characters.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return showToast('error', 'Validation', 'Enter a valid email address, such as sanjay@example.com.');
    if (!/^\+?[\d\s-]{10,}$/.test(form.phone.trim())) return showToast('error', 'Validation', 'Enter a valid phone number (10 digits).');
    if (editing === 'new' && password.length < 6) return showToast('error', 'Validation', 'Password must have at least 6 characters.');
    try {
      if (editing === 'new') {
        await dispatch(createRegionalAdmin({ name: form.name.trim(), email: form.email.trim(), region: form.region.trim(), phone: form.phone.trim(), password })).unwrap();
      } else {
        await dispatch(updateRegionalAdmin({ id: editing, changes: { region: form.region.trim() } })).unwrap();
        await dispatch(updateAccount({ id: editing, changes: { name: form.name.trim(), email: form.email.trim().toLowerCase(), phone: form.phone.trim() } })).unwrap();
      }
      closeEditor();
      showToast('success', editing === 'new' ? 'Admin Added' : 'Admin Updated', editing === 'new' ? 'Admin signs in with their email and chosen password.' : 'Regional admin saved successfully.');
    } catch (error) { showToast('error', 'Error', error?.message || error); }
  }

  async function setStatus(next) {
    try {
      await dispatch(updateAccount({ id: target.id, changes: { status: next } })).unwrap();
      showToast('success', next === 'active' ? 'Admin activated' : 'Admin suspended', `${target.name} ${next === 'active' ? 'can sign in again' : 'is signed out and cannot sign in'}.`);
      closeDialog();
    } catch (error) { showToast('error', 'Error', error?.message || error); }
  }

  async function resetPassword() {
    const next = generatePassword();
    try {
      await dispatch(updateAccount({ id: target.id, changes: { password: next } })).unwrap();
      setIssued(next);
      setDialog({ type: 'issued', id: target.id });
    } catch (error) { showToast('error', 'Error', error?.message || error); }
  }

  async function remove() {
    try {
      await dispatch(deleteAccount(target.id)).unwrap();
      showToast('success', 'Admin removed', `${target.name} no longer has access.`);
      closeDialog();
    } catch (error) { showToast('error', 'Could not remove admin', `${error?.message || error}. Suspend the admin instead.`); }
  }

  return <section id="regional-admins-sec" className="section active">
    <div className="sec-hdr"><h2>Regional Admins</h2><p>Create, edit, suspend and remove administrators, and see which regions they cover</p>
      <div className="hdr-actions"><button className="btn-confirm-blue" style={{ marginTop: 12, padding: '10px 16px', borderRadius: 6, fontWeight: 600 }} onClick={openAdd}>+ Add Regional Admin</button></div>
    </div>
    <div className="pay-summary">
      <StatCard icon="supervisor_account" color="blue" value={admins.length} label="Total Admins" />
      <StatCard icon="verified_user" color="green" value={admins.filter((a) => normalizeStatus(a.status) === 'active').length} label="Active Admins" />
      <StatCard icon="block" color="purple" value={admins.filter((a) => normalizeStatus(a.status) === 'suspended').length} label="Suspended" valueStyle={{ color: '#b91c1c' }} />
      <StatCard icon="map" color="yellow" value={uncovered.length} label="PGs in uncovered regions" valueStyle={{ color: uncovered.length ? '#d97706' : undefined }} />
    </div>
    {uncovered.length > 0 && (
      <p style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '10px 14px', borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
        No admin covers: {uncovered.slice(0, 6).map((p) => `${p.name} (${p.location || p.city || 'unknown'})`).join(', ')}{uncovered.length > 6 ? ` and ${uncovered.length - 6} more` : ''}.
      </p>
    )}
    <div className="tbl-wrap"><div className="tbl-hdr"><div className="search-wrap"><span className="s-ico"><span className="material-icons-outlined" style={{ fontSize: 18 }}>search</span></span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, email, phone or region..." /></div></div>
      <table className="data-tbl"><thead><tr><th>Admin</th><th>Contact</th><th>Region</th><th>PGs in region</th><th>Since</th><th>Status</th><th className="ta-right">Actions</th></tr></thead>
        <tbody>{filtered.length ? filtered.map((admin) => {
          const st = normalizeStatus(admin.status) || 'active';
          const pgs = properties.filter((p) => inRegion(p, admin.region));
          return <tr key={admin.id || admin.email}>
            <td style={cellStyle}><strong>{admin.name}</strong></td>
            <td style={cellStyle}>{admin.email}<div style={subText}>{admin.phone || ''}</div></td>
            <td style={cellStyle}><Pill tone="indigo">{admin.region || 'Unassigned'}</Pill></td>
            <td style={cellStyle}>{pgs.length}<div style={subText}>{pgs.filter((p) => p.status === 'pending').length} pending review</div></td>
            <td style={cellStyle}>{formatDate(admin.createdAt)}</td>
            <td style={cellStyle}><Pill tone={ACCOUNT_TONE[st]}>{st}</Pill></td>
            <td style={{ ...cellStyle, textAlign: 'right' }}>
              <div style={{ display: 'inline-flex', gap: 6 }}>
                <IconAction icon="edit" title="Edit" onClick={() => openEdit(admin)} />
                {st === 'active'
                  ? <IconAction icon="block" title="Suspend" danger onClick={() => setDialog({ type: 'suspend', id: admin.id })} />
                  : <IconAction icon="check_circle" title="Activate" onClick={() => setDialog({ type: 'activate', id: admin.id })} />}
                <IconAction icon="key" title="Reset password" onClick={() => setDialog({ type: 'reset', id: admin.id })} />
                <IconAction icon="person_remove" title="Remove admin" danger onClick={() => setDialog({ type: 'delete', id: admin.id })} />
              </div>
            </td>
          </tr>;
        }) : <tr><td colSpan="7" className="ta-center" style={{ padding: 40, color: '#94a3b8' }}>No regional admins found.</td></tr>}</tbody>
      </table>
    </div>

    {editing && <Dialog title={editing === 'new' ? 'New Admin' : 'Edit Admin'} onClose={closeEditor}
      footer={<><button className="btn-cancel" onClick={closeEditor}>Cancel</button><button className="btn-confirm-blue" disabled={saving} onClick={save}>{saving ? 'Saving...' : editing === 'new' ? 'Save' : 'Save Changes'}</button></>}>
      {[['name', 'Name', 'text'], ['email', editing === 'new' ? 'Email (also the login username)' : 'Email', 'email'], ['phone', 'Phone', 'tel'], ['region', 'Region (e.g. Bangalore)', 'text']].map(([key, label, type]) => (
        <div key={key} style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748b' }}>{label}</label>
          <input className="form-input" style={{ width: '100%', padding: 8 }} type={type} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
        </div>
      ))}
      {editing === 'new' && <div>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#64748b' }}>Password (at least 6 characters)</label>
        <input className="form-input" style={{ width: '100%', padding: 8 }} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      </div>}
      {editing !== 'new' && <p style={{ ...subText, marginTop: 6 }}>Changing the email does not change the admin's login ID.</p>}
    </Dialog>}

    {(dialog?.type === 'suspend' || dialog?.type === 'activate') && target && <Dialog title={dialog.type === 'suspend' ? 'Suspend admin?' : 'Activate admin?'} onClose={closeDialog}
      footer={<><button className="btn-cancel" onClick={closeDialog}>Cancel</button><button className={dialog.type === 'suspend' ? 'btn-confirm-red' : 'btn-confirm-green'} disabled={saving} onClick={() => setStatus(dialog.type === 'suspend' ? 'suspended' : 'active')}>{saving ? 'Saving...' : dialog.type === 'suspend' ? 'Suspend' : 'Activate'}</button></>}>
      {dialog.type === 'suspend'
        ? <p><strong>{target.name}</strong> ({target.region || 'no region'}) is signed out on their next action and cannot sign in until re-activated.</p>
        : <p><strong>{target.name}</strong> will be able to sign in to the Admin portal again.</p>}
    </Dialog>}

    {dialog?.type === 'reset' && target && <Dialog title="Reset admin password?" onClose={closeDialog}
      footer={<><button className="btn-cancel" onClick={closeDialog}>Cancel</button><button className="btn-confirm-blue" disabled={saving} onClick={resetPassword}>{saving ? 'Resetting...' : 'Reset password'}</button></>}>
      <p>A new random password is set for <strong>{target.name}</strong>. Their current password stops working; you will see the new one once.</p>
    </Dialog>}

    {dialog?.type === 'issued' && target && issued && <Dialog title="New admin password" onClose={closeDialog}
      footer={<button className="btn-confirm-blue" onClick={closeDialog}>Done</button>}>
      <p style={{ marginBottom: 10 }}>Send this to <strong>{target.name}</strong> now. It is not shown again after you close this.</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <code style={{ flex: 1, background: '#f1f5f9', padding: '6px 10px', borderRadius: 6 }}>{issued}</code>
        <CopyButton text={issued} />
      </div>
    </Dialog>}

    {dialog?.type === 'delete' && target && <Dialog title="Remove admin?" onClose={closeDialog}
      footer={<><button className="btn-cancel" onClick={closeDialog}>Cancel</button><button className="btn-confirm-red" disabled={saving || confirmText !== 'DELETE'} onClick={remove}>{saving ? 'Removing...' : 'Remove forever'}</button></>}>
      <p>This permanently deletes <strong>{target.name}</strong>'s admin account. To only block access, suspend instead.</p>
      <label style={{ display: 'block', marginTop: 12, fontSize: 12, color: '#64748b' }}>Type DELETE to confirm</label>
      <input className="form-input" style={{ width: '100%', padding: 8, marginTop: 4 }} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
    </Dialog>}
  </section>;
}
