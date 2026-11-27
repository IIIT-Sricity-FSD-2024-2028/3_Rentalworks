import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import useScreenState from '../../../app/useScreenState';
import StatCard from '../components/StatCard';
import { CopyButton, Dialog, Facts, IconAction, Pill, Tabs } from '../components/controls';
import { ACCOUNT_TONE, ROLE_LABEL, ROLE_TONE, cellStyle, downloadCsv, generatePassword, subText } from '../components/controlUtils';
import {
  deleteAccount, fetchSuperAdminAccounts, fetchSuperAdminBookings, selectPlatformAccounts,
  selectSuperAdminBookings, selectSuperAdminOverview, selectSuperAdminSaving, updateAccount,
} from '../../../features/superadmin/superAdminSlice';
import { selectSubscriptions } from '../../../features/subscriptions/subscriptionReportSlice';
import useSubscriptionReport from '../../../features/subscriptions/useSubscriptionReport';
import { selectCurrentUser } from '../../../features/auth/authSlice';
import { PAID_STATUSES } from '../../../data/catalog';
import { formatDate, formatINR, normalizeStatus } from '../../../utils/normalize';
import { sumMoney } from '../../../utils/revenue';

const ROLES = ['admin', 'owner', 'warden', 'tenant', 'guest', 'super_admin'];
const isProtected = (u, me) => u.role === 'super_admin' || String(u.id) === String(me?.id);

/**
 * Users & Access: every account on the platform. The super admin can suspend or
 * re-activate anyone (a suspended account is signed out on its next request),
 * reset a password, and delete accounts. Super admin accounts are read-only here.
 */
export default function UserControl({ showToast }) {
  const dispatch = useDispatch();
  const me = useSelector(selectCurrentUser);
  const accounts = useSelector(selectPlatformAccounts);
  const bookings = useSelector(selectSuperAdminBookings);
  const overview = useSelector(selectSuperAdminOverview);
  const subscriptions = useSelector(selectSubscriptions);
  const saving = useSelector(selectSuperAdminSaving);
  const [role, setRole] = useScreenState('all');
  const [status, setStatus] = useScreenState('all');
  const [search, setSearch] = useScreenState('');
  const [dialog, setDialog] = useScreenState(null); // { type, id }
  const [confirmText, setConfirmText] = useScreenState('');
  const [issued, setIssued] = useScreenState(null, { secret: true }); // { id, password } shown once (Redux, masked in DevTools)

  useSubscriptionReport(); // owner plans for the details dialog
  useEffect(() => {
    dispatch(fetchSuperAdminAccounts());
    dispatch(fetchSuperAdminBookings());
  }, [dispatch]);

  const { properties = [], payments = [] } = overview || {};
  const target = accounts.find((u) => String(u.id) === String(dialog?.id));

  const count = (r) => accounts.filter((u) => u.role === r).length;
  const countStatus = (s) => accounts.filter((u) => normalizeStatus(u.status) === s).length;

  const q = search.trim().toLowerCase();
  const rows = accounts
    .filter((u) => role === 'all' || u.role === role)
    .filter((u) => status === 'all' || normalizeStatus(u.status) === status)
    .filter((u) => !q || [u.name, u.email, u.username, u.phone, u.region, u.city].some((v) => String(v || '').toLowerCase().includes(q)))
    .sort((a, b) => b.id - a.id);

  const close = () => {
    setDialog(null);
    setConfirmText('');
  };

  const setAccountStatus = async (u, next) => {
    try {
      await dispatch(updateAccount({ id: u.id, changes: { status: next } })).unwrap();
      showToast('success', next === 'active' ? 'Account activated' : 'Account suspended',
        next === 'active' ? `${u.name} can sign in again.` : `${u.name} is signed out and cannot sign in.`);
      close();
    } catch (err) {
      showToast('error', 'Could not update account', err?.message || err);
    }
  };

  const resetPassword = async (u) => {
    const password = generatePassword();
    try {
      await dispatch(updateAccount({ id: u.id, changes: { password } })).unwrap();
      setIssued({ id: u.id, password });
      setDialog({ type: 'issued', id: u.id });
    } catch (err) {
      showToast('error', 'Could not reset password', err?.message || err);
    }
  };

  const remove = async (u) => {
    try {
      await dispatch(deleteAccount(u.id)).unwrap();
      showToast('success', 'Account deleted', `${u.name} was removed from the platform.`);
      close();
    } catch (err) {
      showToast('error', 'Could not delete account', `${err?.message || err}. Accounts with bookings or payments can be suspended instead.`);
    }
  };

  const exportCsv = () => downloadCsv(
    `rentbro-accounts-${new Date().toISOString().slice(0, 10)}.csv`,
    ['ID', 'Name', 'Login ID', 'Role', 'Status', 'Email', 'Phone', 'Region / City', 'Joined'],
    rows.map((u) => [u.id, u.name, u.username, u.role, u.status, u.email, u.phone, u.region || u.city, String(u.createdAt || '').slice(0, 10)]),
  );

  // Details for the "view" dialog.
  const detail = (u) => {
    const theirPayments = payments.filter((p) => String(p.tenantId) === String(u.id));
    const paid = theirPayments.filter((p) => PAID_STATUSES.includes(normalizeStatus(p.status)));
    const theirBookings = bookings.filter((b) => String(b.tenantId ?? b.tenant?.id) === String(u.id));
    const owned = properties.filter((p) => String(p.ownerId ?? p.owner?.id) === String(u.id));
    const linked = properties.filter((p) => (u.propertyIds || []).map(String).includes(String(p.id)));
    const plan = subscriptions.find((s) => String(s.ownerId) === String(u.id));
    return [
      ['Login ID', u.username],
      ['Role', ROLE_LABEL[u.role] || u.role],
      ['Status', u.status],
      ['Email', u.email],
      ['Phone', u.phone],
      (u.region || u.city) && ['Region / City', u.region || u.city],
      ['Joined', formatDate(u.createdAt)],
      u.preferences?.guestId && ['Booked by guest', `#${u.preferences.guestId}`],
      u.role === 'owner' && ['PGs owned', owned.length ? owned.map((p) => `${p.name} (${p.status})`).join(', ') : 'None'],
      u.role === 'owner' && ['Plan', plan ? `${plan.planName} · ${plan.status}${plan.endDate ? ` · until ${formatDate(plan.endDate)}` : ''}` : 'No plan'],
      ['tenant', 'warden'].includes(u.role) && ['Linked PGs', linked.length ? linked.map((p) => p.name).join(', ') : 'None'],
      ['tenant', 'guest'].includes(u.role) && ['Bookings', `${theirBookings.length}${theirBookings.length ? ` (${[...new Set(theirBookings.map((b) => b.status))].join(', ')})` : ''}`],
      ['tenant', 'guest'].includes(u.role) && ['Paid so far', `${formatINR(sumMoney(paid, (p) => p.amount))} in ${paid.length} payment${paid.length === 1 ? '' : 's'}`],
    ];
  };

  return (
    <section className="section active">
      <div className="sec-hdr">
        <h2>Users &amp; Access</h2>
        <p>Every account on the platform: suspend, re-activate, reset passwords or remove</p>
      </div>

      <div className="pay-summary">
        <StatCard icon="groups" color="blue" value={accounts.length} label="All Accounts" />
        <StatCard icon="verified_user" color="green" value={countStatus('active')} label="Active" />
        <StatCard icon="hourglass_top" color="yellow" value={countStatus('pending')} label="Pending Approval" valueStyle={{ color: '#d97706' }} />
        <StatCard icon="block" color="purple" value={countStatus('suspended')} label="Suspended" valueStyle={{ color: '#b91c1c' }} />
      </div>

      <Tabs
        value={role}
        onChange={setRole}
        tabs={[['all', 'All', accounts.length], ...ROLES.map((r) => [r, `${ROLE_LABEL[r]}s`, count(r)])]}
      />

      <div className="tbl-wrap">
        <div className="tbl-hdr">
          <div className="search-wrap">
            <span className="s-ico"><span className="material-icons-outlined" style={{ fontSize: 18 }}>search</span></span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, login ID, email, phone, region..." />
          </div>
          <select className="sel" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
            <option value="evicted">Removed tenants</option>
          </select>
          <button type="button" className="btn-cancel" onClick={exportCsv}>Export CSV</button>
        </div>
        <table className="data-tbl">
          <thead>
            <tr><th>Account</th><th>Role</th><th>Contact</th><th>Region / City</th><th>Joined</th><th>Status</th><th className="ta-right">Actions</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan="7" className="ta-center" style={{ padding: 40, color: '#94a3b8' }}>No accounts match.</td></tr>
            ) : rows.map((u) => {
              const st = normalizeStatus(u.status) || 'active';
              const locked = isProtected(u, me);
              return (
                <tr key={u.id}>
                  <td style={cellStyle}>
                    <strong>{u.name || '—'}</strong>
                    <div style={{ ...subText, fontFamily: 'monospace' }}>{u.username || `#${u.id}`}</div>
                  </td>
                  <td style={cellStyle}><Pill tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role] || u.role}</Pill></td>
                  <td style={cellStyle}>
                    <div>{u.email || '—'}</div>
                    <div style={subText}>{u.phone || ''}</div>
                  </td>
                  <td style={cellStyle}>{u.region || u.city || '—'}</td>
                  <td style={cellStyle}>{formatDate(u.createdAt)}</td>
                  <td style={cellStyle}><Pill tone={ACCOUNT_TONE[st]}>{st === 'evicted' ? 'removed' : st}</Pill></td>
                  <td style={{ ...cellStyle, textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <IconAction icon="visibility" title="View details" onClick={() => setDialog({ type: 'view', id: u.id })} />
                      {!locked && (st === 'active'
                        ? <IconAction icon="block" title="Suspend" danger onClick={() => setDialog({ type: 'suspend', id: u.id })} />
                        : <IconAction icon="check_circle" title="Activate" onClick={() => setDialog({ type: 'activate', id: u.id })} />)}
                      {!locked && <IconAction icon="key" title="Reset password" onClick={() => setDialog({ type: 'reset', id: u.id })} />}
                      {!locked && <IconAction icon="delete" title="Delete account" danger onClick={() => setDialog({ type: 'delete', id: u.id })} />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="tbl-footer" style={{ padding: '10px 16px', fontSize: 12, color: '#64748b' }}>Showing {rows.length} of {accounts.length} accounts</div>
      </div>

      {dialog?.type === 'view' && target && (
        <Dialog title={target.name || 'Account'} onClose={close} width={540}
          footer={<button className="btn-cancel" onClick={close}>Close</button>}>
          <Facts rows={detail(target)} />
        </Dialog>
      )}

      {(dialog?.type === 'suspend' || dialog?.type === 'activate') && target && (
        <Dialog
          title={dialog.type === 'suspend' ? 'Suspend account?' : 'Activate account?'}
          onClose={close}
          footer={<>
            <button className="btn-cancel" onClick={close}>Cancel</button>
            <button className={dialog.type === 'suspend' ? 'btn-confirm-red' : 'btn-confirm-green'} disabled={saving}
              onClick={() => setAccountStatus(target, dialog.type === 'suspend' ? 'suspended' : 'active')}>
              {saving ? 'Saving...' : dialog.type === 'suspend' ? 'Suspend' : 'Activate'}
            </button>
          </>}
        >
          {dialog.type === 'suspend'
            ? <p><strong>{target.name}</strong> ({ROLE_LABEL[target.role]}) will be signed out on their next action and cannot sign in until re-activated. Their data is kept.</p>
            : <p><strong>{target.name}</strong> ({ROLE_LABEL[target.role]}) will be able to sign in again.</p>}
        </Dialog>
      )}

      {dialog?.type === 'reset' && target && (
        <Dialog title="Reset password?" onClose={close}
          footer={<>
            <button className="btn-cancel" onClick={close}>Cancel</button>
            <button className="btn-confirm-blue" disabled={saving} onClick={() => resetPassword(target)}>{saving ? 'Resetting...' : 'Reset password'}</button>
          </>}>
          <p>A new random password is set for <strong>{target.name}</strong> ({target.username}). Their current password stops working. You will see the new one once, to send to them.</p>
        </Dialog>
      )}

      {dialog?.type === 'issued' && target && issued?.id === target.id && (
        <Dialog title="New password" onClose={() => { setIssued(null); close(); }}
          footer={<button className="btn-confirm-blue" onClick={() => { setIssued(null); close(); }}>Done</button>}>
          <p style={{ marginBottom: 12 }}>Send these to <strong>{target.name}</strong> now. The password is not shown again after you close this.</p>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 80, color: '#64748b' }}>Login ID</span>
              <code style={{ flex: 1, background: '#f1f5f9', padding: '6px 10px', borderRadius: 6 }}>{target.username}</code>
              <CopyButton text={target.username || ''} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 80, color: '#64748b' }}>Password</span>
              <code style={{ flex: 1, background: '#f1f5f9', padding: '6px 10px', borderRadius: 6 }}>{issued.password}</code>
              <CopyButton text={issued.password} />
            </div>
          </div>
        </Dialog>
      )}

      {dialog?.type === 'delete' && target && (
        <Dialog title="Delete account?" onClose={close}
          footer={<>
            <button className="btn-cancel" onClick={close}>Cancel</button>
            <button className="btn-confirm-red" disabled={saving || confirmText !== 'DELETE'} onClick={() => remove(target)}>{saving ? 'Deleting...' : 'Delete forever'}</button>
          </>}>
          <p>This permanently removes <strong>{target.name}</strong> ({ROLE_LABEL[target.role]}, {target.username}). It cannot be undone. To only block access, suspend the account instead.</p>
          <label style={{ display: 'block', marginTop: 12, fontSize: 12, color: '#64748b' }}>Type DELETE to confirm</label>
          <input className="form-input" style={{ width: '100%', padding: 8, marginTop: 4 }} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
        </Dialog>
      )}
    </section>
  );
}
