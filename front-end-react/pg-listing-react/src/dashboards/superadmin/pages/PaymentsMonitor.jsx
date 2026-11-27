import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import useScreenState from '../../../app/useScreenState';
import StatCard from '../components/StatCard';
import { Dialog, Facts, IconAction, Pill } from '../components/controls';
import { cellStyle, downloadCsv, subText } from '../components/controlUtils';
import {
  fetchSuperAdminAccounts, selectPlatformAccounts, selectSuperAdminOverview, selectSuperAdminSaving, updatePaymentRecord,
} from '../../../features/superadmin/superAdminSlice';
import { PAID_STATUSES } from '../../../data/catalog';
import { formatDate, formatINR, normalizeStatus } from '../../../utils/normalize';
import { sumMoney } from '../../../utils/revenue';
import { lastMonths, monthKey } from '../../../utils/months';

const STATUS_TONE = { verified: 'green', completed: 'green', success: 'green', paid: 'green', pending: 'amber', processing: 'amber', failed: 'red', refunded: 'indigo', disputed: 'red' };
const SET_STATUSES = [
  ['verified', 'Verified (money received)'],
  ['pending', 'Pending (awaiting confirmation)'],
  ['failed', 'Failed'],
  ['refunded', 'Refunded'],
  ['disputed', 'Disputed (under review)'],
];
const isPaid = (p) => PAID_STATUSES.includes(normalizeStatus(p.status));

/**
 * Payments monitor: every tenant payment on the platform (booking + monthly
 * rent), with totals, filters, CSV export and status correction.
 */
export default function PaymentsMonitor({ showToast }) {
  const dispatch = useDispatch();
  const overview = useSelector(selectSuperAdminOverview);
  const accounts = useSelector(selectPlatformAccounts);
  const saving = useSelector(selectSuperAdminSaving);
  const [search, setSearch] = useScreenState('');
  const [status, setStatus] = useScreenState('all');
  const [kind, setKind] = useScreenState('all');
  const [month, setMonth] = useScreenState('all');
  const [propertyId, setPropertyId] = useScreenState('all');
  const [dialog, setDialog] = useScreenState(null); // { type: 'view' | 'status', id, next? }

  useEffect(() => {
    dispatch(fetchSuperAdminAccounts());
  }, [dispatch]);

  const { payments = [], properties = [] } = overview || {};
  const userById = new Map(accounts.map((u) => [String(u.id), u]));
  const propById = new Map(properties.map((p) => [String(p.id), p]));
  const months = lastMonths(6);
  const thisMonth = monthKey(new Date());
  const dateOf = (p) => p.paidDate || p.createdAt;

  const paid = payments.filter(isPaid);
  const pending = payments.filter((p) => ['pending', 'processing'].includes(normalizeStatus(p.status)));
  const problems = payments.filter((p) => ['failed', 'disputed'].includes(normalizeStatus(p.status)));
  const refunded = payments.filter((p) => normalizeStatus(p.status) === 'refunded');

  const q = search.trim().toLowerCase();
  const rows = payments
    .filter((p) => status === 'all' || (status === 'paid' ? isPaid(p) : normalizeStatus(p.status) === status))
    .filter((p) => kind === 'all' || (p.kind || 'booking') === kind)
    .filter((p) => month === 'all' || monthKey(dateOf(p)) === month)
    .filter((p) => propertyId === 'all' || String(p.propertyId) === propertyId)
    .filter((p) => {
      if (!q) return true;
      const t = userById.get(String(p.tenantId));
      return [p.transactionId, t?.name, t?.username, t?.phone, propById.get(String(p.propertyId))?.name, p.room]
        .some((v) => String(v || '').toLowerCase().includes(q));
    })
    .sort((a, b) => String(dateOf(b)).localeCompare(String(dateOf(a))) || b.id - a.id);

  const target = payments.find((p) => String(p.id) === String(dialog?.id));

  const applyStatus = async () => {
    try {
      await dispatch(updatePaymentRecord({ id: target.id, changes: { status: dialog.next } })).unwrap();
      showToast('success', 'Payment updated', `${target.transactionId || `#${target.id}`} is now ${dialog.next}.`);
      setDialog(null);
    } catch (err) {
      showToast('error', 'Could not update payment', err?.message || err);
    }
  };

  const exportCsv = () => downloadCsv(
    `rentbro-payments-${new Date().toISOString().slice(0, 10)}.csv`,
    ['ID', 'Date', 'Transaction', 'Tenant', 'Tenant ID', 'Property', 'Room', 'Type', 'Method', 'Amount', 'Platform fee', 'Status'],
    rows.map((p) => {
      const t = userById.get(String(p.tenantId));
      return [p.id, String(dateOf(p) || '').slice(0, 10), p.transactionId, t?.name, t?.username, propById.get(String(p.propertyId))?.name, p.room, p.kind || 'booking', p.method, p.amount, p.platformFee, p.status];
    }),
  );

  return (
    <section className="section active">
      <div className="sec-hdr">
        <h2>Payments Monitor</h2>
        <p>Every tenant payment across all PGs, with totals and status control</p>
      </div>

      <div className="stats-row">
        <StatCard icon="payments" color="green" value={formatINR(sumMoney(paid, (p) => p.amount))} label={`Collected (${paid.length})`} />
        <StatCard icon="account_balance_wallet" color="blue" value={formatINR(sumMoney(paid, (p) => p.platformFee))} label="Platform Fees" />
        <StatCard icon="calendar_month" color="purple" value={formatINR(sumMoney(paid.filter((p) => monthKey(dateOf(p)) === thisMonth), (p) => p.amount))} label="Collected This Month" />
        <StatCard icon="hourglass_top" color="yellow" value={pending.length} label="Pending" valueStyle={{ color: '#d97706' }} />
        <StatCard icon="report" color="purple" value={problems.length + refunded.length} label={`Failed / Disputed / Refunded`} valueStyle={{ color: '#b91c1c' }} />
      </div>

      <div className="tbl-wrap">
        <div className="tbl-hdr">
          <div className="search-wrap">
            <span className="s-ico"><span className="material-icons-outlined" style={{ fontSize: 18 }}>search</span></span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transaction, tenant, Tenant ID, phone, PG..." />
          </div>
          <select className="sel" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="disputed">Disputed</option>
            <option value="refunded">Refunded</option>
          </select>
          <select className="sel" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="all">All types</option>
            <option value="booking">Booking</option>
            <option value="rent">Monthly rent</option>
          </select>
          <select className="sel" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="all">All months</option>
            {[...months].reverse().map((m) => <option key={m.key} value={m.key}>{m.label} {m.key.slice(0, 4)}</option>)}
          </select>
          <select className="sel" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
            <option value="all">All PGs</option>
            {properties.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
          </select>
          <button type="button" className="btn-cancel" onClick={exportCsv}>Export CSV</button>
        </div>
        <table className="data-tbl">
          <thead>
            <tr><th>Date</th><th>Tenant</th><th>PG &amp; Room</th><th>Type</th><th className="ta-right">Amount</th><th className="ta-right">Fee</th><th>Status</th><th className="ta-right">Actions</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan="8" className="ta-center" style={{ padding: 40, color: '#94a3b8' }}>No payments match.</td></tr>
            ) : rows.map((p) => {
              const t = userById.get(String(p.tenantId));
              const st = normalizeStatus(p.status);
              return (
                <tr key={p.id}>
                  <td style={cellStyle}>
                    {formatDate(dateOf(p))}
                    <div style={{ ...subText, fontFamily: 'monospace' }}>{p.transactionId || `#${p.id}`}</div>
                  </td>
                  <td style={cellStyle}>
                    <strong>{t?.name || `User #${p.tenantId}`}</strong>
                    <div style={{ ...subText, fontFamily: 'monospace' }}>{[t?.username, t?.phone].filter(Boolean).join(' · ')}</div>
                  </td>
                  <td style={cellStyle}>
                    {propById.get(String(p.propertyId))?.name || `PG #${p.propertyId}`}
                    <div style={subText}>Room {p.room || '—'}</div>
                  </td>
                  <td style={cellStyle}><Pill tone={p.kind === 'rent' ? 'blue' : 'slate'}>{p.kind === 'rent' ? 'Rent' : 'Booking'}</Pill></td>
                  <td style={{ ...cellStyle, textAlign: 'right' }}><strong>{formatINR(p.amount)}</strong><div style={subText}>{String(p.method || '').toUpperCase()}</div></td>
                  <td style={{ ...cellStyle, textAlign: 'right' }}>{formatINR(p.platformFee)}</td>
                  <td style={cellStyle}><Pill tone={STATUS_TONE[st] || 'slate'}>{st || 'unknown'}</Pill></td>
                  <td style={{ ...cellStyle, textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <IconAction icon="visibility" title="View details" onClick={() => setDialog({ type: 'view', id: p.id })} />
                      <IconAction icon="edit_note" title="Change status" onClick={() => setDialog({ type: 'status', id: p.id, next: st })} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ padding: '10px 16px', fontSize: 12, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
          <span>Showing {rows.length} of {payments.length} payments</span>
          <span>Paid in view: <strong>{formatINR(sumMoney(rows.filter(isPaid), (p) => p.amount))}</strong></span>
        </div>
      </div>

      {dialog?.type === 'view' && target && (() => {
        const t = userById.get(String(target.tenantId));
        return (
          <Dialog title={`Payment ${target.transactionId || `#${target.id}`}`} onClose={() => setDialog(null)} width={520}
            footer={<button className="btn-cancel" onClick={() => setDialog(null)}>Close</button>}>
            <Facts rows={[
              ['Tenant', `${t?.name || `#${target.tenantId}`}${t?.username ? ` (${t.username})` : ''}`],
              ['PG', propById.get(String(target.propertyId))?.name],
              ['Room', target.room],
              ['Type', target.kind === 'rent' ? 'Monthly rent' : 'Booking'],
              ['Paid on', formatDate(dateOf(target))],
              ['Method', String(target.method || '').toUpperCase()],
              ['Amount', formatINR(target.amount)],
              target.rentAmount != null && ['Rent part', formatINR(target.rentAmount)],
              target.depositAmount != null && ['Deposit part', formatINR(target.depositAmount)],
              target.feeAmount != null && ['Fee part', formatINR(target.feeAmount)],
              ['Platform fee', formatINR(target.platformFee)],
              ['Status', target.status],
              ['Clearance', target.clearance],
            ]} />
          </Dialog>
        );
      })()}

      {dialog?.type === 'status' && target && (
        <Dialog title="Change payment status" onClose={() => setDialog(null)}
          footer={<>
            <button className="btn-cancel" onClick={() => setDialog(null)}>Cancel</button>
            <button className="btn-confirm-blue" disabled={saving || dialog.next === normalizeStatus(target.status)} onClick={applyStatus}>{saving ? 'Saving...' : 'Save'}</button>
          </>}>
          <p style={{ marginBottom: 10 }}>{formatINR(target.amount)} from {userById.get(String(target.tenantId))?.name || `#${target.tenantId}`} ({target.transactionId}). Use this to correct the record, e.g. after a bank reversal or refund.</p>
          <div style={{ display: 'grid', gap: 6 }}>
            {SET_STATUSES.map(([value, label]) => (
              <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="radio" name="pay-status" checked={dialog.next === value} onChange={() => setDialog({ ...dialog, next: value })} />
                {label}
              </label>
            ))}
          </div>
        </Dialog>
      )}
    </section>
  );
}
