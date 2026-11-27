import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import useScreenState from '../../../app/useScreenState';
import StatCard from '../components/StatCard';
import { Dialog, Facts, IconAction, Pill, Tabs } from '../components/controls';
import { ACCOUNT_TONE, cellStyle, daysUntil, downloadCsv, subText } from '../components/controlUtils';
import useSubscriptionReport from '../../../features/subscriptions/useSubscriptionReport';
import { selectSubscriptions, selectSubscriptionSummary } from '../../../features/subscriptions/subscriptionReportSlice';
import {
  fetchSuperAdminAccounts, selectPlatformAccounts, selectSuperAdminOverview, selectSuperAdminSaving, updateAccount,
} from '../../../features/superadmin/superAdminSlice';
import { formatDate, formatINR, normalizeStatus } from '../../../utils/normalize';
import { formatSubscriptionAmount } from '../../../utils/revenue';

const EXPIRING_DAYS = 30;
const PLAN_TONE = { ACTIVE: 'green', EXPIRING: 'amber', EXPIRED: 'red', CANCELLED: 'slate', PENDING: 'blue', NONE: 'slate' };

/**
 * Subscription monitoring: every owner's plan (owners choose and pay for plans
 * themselves). Flags plans that are expiring or expired, owners who run PGs with
 * no plan, and lets the super admin suspend / re-activate an owner account.
 */
export default function SubscriptionMonitor({ showToast }) {
  const dispatch = useDispatch();
  const { data: report, error, status: reportStatus } = useSubscriptionReport();
  const subscriptions = useSelector(selectSubscriptions);
  const summary = useSelector(selectSubscriptionSummary);
  const accounts = useSelector(selectPlatformAccounts);
  const overview = useSelector(selectSuperAdminOverview);
  const saving = useSelector(selectSuperAdminSaving);
  const [tab, setTab] = useScreenState('all');
  const [search, setSearch] = useScreenState('');
  const [dialog, setDialog] = useScreenState(null); // { type: 'view' | 'suspend' | 'activate', ownerId }

  useEffect(() => {
    dispatch(fetchSuperAdminAccounts());
  }, [dispatch]);

  const properties = overview?.properties || [];
  const owners = accounts.filter((u) => u.role === 'owner');
  const subByOwner = new Map(subscriptions.map((s) => [String(s.ownerId), s]));

  // One row per owner: their latest plan (or none), with a monitoring state.
  const rows = owners.map((o) => {
    const sub = subByOwner.get(String(o.id)) || null;
    const days = sub ? daysUntil(sub.endDate) : null;
    let state = sub ? String(sub.status || '').toUpperCase() : 'NONE';
    if (state === 'ACTIVE' && days !== null && days <= EXPIRING_DAYS) state = 'EXPIRING';
    const pgs = properties.filter((p) => String(p.ownerId ?? p.owner?.id) === String(o.id));
    return { owner: o, sub, days, state, pgs, livePgs: pgs.filter((p) => ['verified', 'approved'].includes(p.status)).length };
  });

  const counts = rows.reduce((acc, r) => ({ ...acc, [r.state]: (acc[r.state] || 0) + 1 }), {});
  const unpaidLive = rows.filter((r) => r.livePgs > 0 && !['ACTIVE', 'EXPIRING'].includes(r.state));
  const monthlyRun = rows
    .filter((r) => ['ACTIVE', 'EXPIRING'].includes(r.state) && r.sub)
    .reduce((sum, r) => {
      const amount = Number(r.sub.amount) || 0;
      const plan = String(r.sub.planType || '').toUpperCase();
      return sum + (plan === 'YEARLY' ? amount / 12 : plan === 'LIFETIME' ? 0 : amount);
    }, 0);

  const q = search.trim().toLowerCase();
  const filtered = rows
    .filter((r) => tab === 'all' || (tab === 'attention' ? unpaidLive.includes(r) || r.state === 'EXPIRING' : r.state === tab))
    .filter((r) => !q || [r.owner.name, r.owner.email, r.owner.username, r.sub?.planName, r.sub?.receipt?.receiptNumber, ...r.pgs.map((p) => p.name)]
      .some((v) => String(v || '').toLowerCase().includes(q)))
    .sort((a, b) => (a.days ?? 99999) - (b.days ?? 99999));

  const target = rows.find((r) => String(r.owner.id) === String(dialog?.ownerId));

  const setOwnerStatus = async (next) => {
    try {
      await dispatch(updateAccount({ id: target.owner.id, changes: { status: next } })).unwrap();
      showToast('success', next === 'active' ? 'Owner activated' : 'Owner suspended', `${target.owner.name} ${next === 'active' ? 'can sign in again' : 'cannot sign in until re-activated'}.`);
      setDialog(null);
    } catch (err) {
      showToast('error', 'Could not update owner', err?.message || err);
    }
  };

  const exportCsv = () => downloadCsv(
    `rentbro-subscriptions-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Owner', 'Email', 'Owner status', 'PGs', 'Plan', 'Amount', 'Start', 'End', 'Days left', 'State', 'Receipt'],
    filtered.map((r) => [r.owner.name, r.owner.email, r.owner.status, r.pgs.map((p) => p.name).join(' | '), r.sub?.planName || 'None', r.sub?.amount, r.sub?.startDate, r.sub?.endDate, r.days ?? '', r.state, r.sub?.receipt?.receiptNumber]),
  );

  const daysText = (r) => {
    if (r.days === null || !r.sub) return '—';
    if (String(r.sub.planType).toUpperCase() === 'LIFETIME') return 'Lifetime';
    if (r.days < 0) return `${-r.days} days ago`;
    return r.days === 0 ? 'Today' : `${r.days} days`;
  };

  return (
    <section className="section active">
      <div className="sec-hdr">
        <h2>Subscription Monitoring</h2>
        <p>Owner plans across the platform: renewals, expiries, unpaid PGs and revenue</p>
      </div>

      <div className="stats-row stats-row-6">
        <StatCard icon="verified" color="green" value={(counts.ACTIVE || 0) + (counts.EXPIRING || 0)} label="Active Plans" />
        <StatCard icon="schedule" color="yellow" value={counts.EXPIRING || 0} label={`Expiring ≤ ${EXPIRING_DAYS} days`} valueStyle={{ color: '#d97706' }} />
        <StatCard icon="event_busy" color="purple" value={counts.EXPIRED || 0} label="Expired" valueStyle={{ color: '#b91c1c' }} />
        <StatCard icon="warning" color="purple" value={unpaidLive.length} label="Live PGs, no plan" valueStyle={{ color: '#b91c1c' }} />
        <StatCard icon="autorenew" color="blue" value={formatINR(Math.round(monthlyRun))} label="Monthly Run-rate" />
        <StatCard icon="payments" color="green" value={summary.totalRevenue === null ? '—' : formatINR(summary.totalRevenue)} label="Subscription Revenue" />
      </div>

      {error && <p role="alert" style={{ color: '#b91c1c' }}>Could not load the subscription report. {error}</p>}
      {report?.ledgerAvailable === false && <p>Subscription payment ledger unavailable: revenue and receipts are hidden.</p>}

      <div className="tbl-wrap" style={{ marginBottom: 16, padding: 16 }}>
        <h3 style={{ fontSize: 14, marginBottom: 10 }}>Plan mix (active plans)</h3>
        {[['MONTHLY', summary.monthly], ['YEARLY', summary.yearly], ['LIFETIME', summary.lifetime]].map(([plan, n]) => {
          const total = Math.max(1, summary.monthly + summary.yearly + summary.lifetime);
          return (
            <div key={plan} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 40px', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 12 }}>
              <span style={{ color: '#475569', fontWeight: 600 }}>{plan.charAt(0) + plan.slice(1).toLowerCase()}</span>
              <div style={{ background: '#f1f5f9', borderRadius: 99, height: 10, overflow: 'hidden' }}>
                <div style={{ width: `${(n / total) * 100}%`, height: '100%', background: '#2563eb', borderRadius: 99 }} />
              </div>
              <strong style={{ textAlign: 'right' }}>{n}</strong>
            </div>
          );
        })}
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[
        ['all', 'All owners', rows.length],
        ['attention', 'Needs attention', unpaidLive.length + (counts.EXPIRING || 0)],
        ['ACTIVE', 'Active', counts.ACTIVE || 0],
        ['EXPIRING', 'Expiring', counts.EXPIRING || 0],
        ['EXPIRED', 'Expired', counts.EXPIRED || 0],
        ['CANCELLED', 'Cancelled', counts.CANCELLED || 0],
        ['NONE', 'No plan', counts.NONE || 0],
      ]} />

      <div className="tbl-wrap">
        <div className="tbl-hdr">
          <div className="search-wrap">
            <span className="s-ico"><span className="material-icons-outlined" style={{ fontSize: 18 }}>search</span></span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search owner, email, PG, plan, receipt..." />
          </div>
          <button type="button" className="btn-cancel" onClick={exportCsv}>Export CSV</button>
        </div>
        <table className="data-tbl">
          <thead>
            <tr><th>Owner</th><th>PGs</th><th>Plan</th><th>Valid until</th><th>Time left</th><th>Plan state</th><th>Account</th><th className="ta-right">Actions</th></tr>
          </thead>
          <tbody>
            {reportStatus === 'loading' && !report ? (
              <tr><td colSpan="8" className="ta-center" style={{ padding: 40, color: '#94a3b8' }}>Loading subscriptions...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="8" className="ta-center" style={{ padding: 40, color: '#94a3b8' }}>No owners match.</td></tr>
            ) : filtered.map((r) => {
              const acc = normalizeStatus(r.owner.status) || 'active';
              return (
                <tr key={r.owner.id}>
                  <td style={cellStyle}><strong>{r.owner.name}</strong><div style={subText}>{r.owner.email}</div></td>
                  <td style={cellStyle}>
                    {r.pgs.length}
                    <div style={subText}>{r.livePgs} live</div>
                  </td>
                  <td style={cellStyle}>{r.sub ? <><strong>{r.sub.planName}</strong><div style={subText}>{formatSubscriptionAmount(r.sub)}</div></> : '—'}</td>
                  <td style={cellStyle}>{r.sub ? formatDate(r.sub.endDate) : '—'}</td>
                  <td style={{ ...cellStyle, color: r.days !== null && r.days < 0 ? '#b91c1c' : r.state === 'EXPIRING' ? '#b45309' : undefined }}>{daysText(r)}</td>
                  <td style={cellStyle}>
                    <Pill tone={PLAN_TONE[r.state] || 'slate'}>{r.state === 'NONE' ? 'No plan' : r.state.toLowerCase()}</Pill>
                    {r.livePgs > 0 && !['ACTIVE', 'EXPIRING'].includes(r.state) && <div style={{ ...subText, color: '#b91c1c' }}>Live PG without plan</div>}
                  </td>
                  <td style={cellStyle}><Pill tone={ACCOUNT_TONE[acc]}>{acc}</Pill></td>
                  <td style={{ ...cellStyle, textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <IconAction icon="visibility" title="View details" onClick={() => setDialog({ type: 'view', ownerId: r.owner.id })} />
                      {acc === 'active'
                        ? <IconAction icon="block" title="Suspend owner" danger onClick={() => setDialog({ type: 'suspend', ownerId: r.owner.id })} />
                        : <IconAction icon="check_circle" title="Activate owner" onClick={() => setDialog({ type: 'activate', ownerId: r.owner.id })} />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ padding: '10px 16px', fontSize: 12, color: '#64748b' }}>Showing {filtered.length} of {rows.length} owners. Owners choose, switch and cancel their own plan from the Owner portal.</div>
      </div>

      {dialog?.type === 'view' && target && (
        <Dialog title={target.owner.name} onClose={() => setDialog(null)} width={540}
          footer={<button className="btn-cancel" onClick={() => setDialog(null)}>Close</button>}>
          <Facts rows={[
            ['Email', target.owner.email],
            ['Phone', target.owner.phone],
            ['Account', target.owner.status],
            ['PGs', target.pgs.length ? target.pgs.map((p) => `${p.name} (${p.status})`).join(', ') : 'None'],
            ['Plan', target.sub ? target.sub.planName : 'No plan'],
            target.sub && ['Amount', formatSubscriptionAmount(target.sub)],
            target.sub && ['Started', formatDate(target.sub.startDate)],
            target.sub && ['Valid until', formatDate(target.sub.endDate)],
            target.sub && ['Plan state', target.state.toLowerCase()],
            target.sub?.receipt && ['Last receipt', `${target.sub.receipt.receiptNumber} · ${formatSubscriptionAmount(target.sub.receipt)} · ${formatDate(target.sub.receipt.paymentDate)}`],
          ]} />
        </Dialog>
      )}

      {(dialog?.type === 'suspend' || dialog?.type === 'activate') && target && (
        <Dialog title={dialog.type === 'suspend' ? 'Suspend owner?' : 'Activate owner?'} onClose={() => setDialog(null)}
          footer={<>
            <button className="btn-cancel" onClick={() => setDialog(null)}>Cancel</button>
            <button className={dialog.type === 'suspend' ? 'btn-confirm-red' : 'btn-confirm-green'} disabled={saving}
              onClick={() => setOwnerStatus(dialog.type === 'suspend' ? 'suspended' : 'active')}>
              {saving ? 'Saving...' : dialog.type === 'suspend' ? 'Suspend' : 'Activate'}
            </button>
          </>}>
          {dialog.type === 'suspend'
            ? <p><strong>{target.owner.name}</strong> is signed out and cannot reach the Owner portal until re-activated. Their PGs, tenants and plan are kept.</p>
            : <p><strong>{target.owner.name}</strong> will be able to sign in to the Owner portal again.</p>}
        </Dialog>
      )}
    </section>
  );
}
