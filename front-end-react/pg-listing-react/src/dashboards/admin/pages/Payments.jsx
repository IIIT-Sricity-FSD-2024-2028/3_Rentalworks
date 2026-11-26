import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { runThunk } from '../../../app/hooks';
import { adminPayments } from '../../../features/admin/adminSlices';
import Modal from '../components/Modal';
import { lastMonths, monthKey } from '../utils/months';

const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
const isPaid = (p) => ['verified', 'completed', 'success'].includes(p.status);
const isCleared = (p) => ['Approved', 'Cleared'].includes(p.clearance);
const getName = (val) => typeof val === 'object' ? (val?.name || 'Unknown') : (val || 'Unknown');

export default function Payments() {
  const dispatch = useDispatch();
  const payments = useSelector(adminPayments.selectors.selectItems);
  const loading = useSelector(adminPayments.selectors.selectIsLoading) && payments.length === 0;
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);

  useEffect(() => {
    dispatch(adminPayments.thunks.fetchAll());
  }, [dispatch]);

  const update = (p, changes, success) => runThunk(dispatch, adminPayments.thunks.updateItem({ id: p.id, changes }), { success });

  const verified = payments.filter(p => isPaid(p));
  const pending = payments.filter(p => p.status === 'pending');
  const gtv = verified.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const platformRev = Math.round(gtv * 0.10);
  const pendingAmt = pending.reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const filtered = payments.filter(p => {
    const q = search.toLowerCase();
    const tName = getName(p.tenant).toLowerCase();
    const pName = getName(p.property).toLowerCase();
    const txn = (p.transactionId || '').toLowerCase();
    return !search || tName.includes(q) || pName.includes(q) || txn.includes(q);
  });

  // Top Earning Properties Calculation matching traditional
  const propEarnings = {};
  verified.forEach(p => {
    const name = getName(p.property) || 'PG';
    propEarnings[name] = (propEarnings[name] || 0) + (Number(p.amount) || 0);
  });
  const topProps = Object.entries(propEarnings)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const topMax = topProps.length ? Math.max(...topProps.map(x => x[1]), 1000) : 10000;

  // Revenue SVG Chart Data points
  const months = lastMonths(6);
  const revPoints = months.map(m => Math.round(0.1 * verified.filter(p => monthKey(p.paidDate || p.createdAt) === m.key).reduce((t, p) => t + Number(p.amount || 0), 0)));
  const revMax = Math.max(...revPoints, 1000);
  const w = 300, h = 120, pad = 10;
  const pts = revPoints.map((v, i) => `${pad + (i / (revPoints.length - 1)) * (w - pad * 2)},${h - pad - ((v / revMax) * (h - pad * 2))}`).join(' ');
  const areaBot = `${pad + (w - pad * 2)},${h - pad} ${pad},${h - pad}`;

  // Actions
  const handleVerify = (p) => update(p, { status: 'verified', clearance: 'Cleared' }, `Payment from ${getName(p.tenant)} verified`);
  const handleApproveClearance = (p) => update(p, { clearance: 'Approved' }, `Clearance approved for ${getName(p.tenant)}`);
  const handleIssueRefund = (p) => {
    const amount = `₹${Number(p.amount || 0).toLocaleString('en-IN')}`;
    if (!window.confirm(`Mark ${amount} from ${getName(p.tenant)} as refunded?`)) return;
    update(p, { status: 'refunded', clearance: 'Refunded' }, `${amount} marked as refunded`);
  };

  const handleView = (p) => {
    setModal({ type: 'view', payment: p });
  };

  return (
    <>
      <div className="sec-hdr">
        <h2>Payment Ledger</h2>
        <p>Verified transactions, platform revenue and refund management</p>
      </div>

      {/* 4 KPI Cards */}
      <div className="pay-summary">
        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon bg-green">
              <span className="material-icons-outlined" style={{ fontSize: 32, color: '#16a34a' }}>payments</span>
            </div>
          </div>
          <div className="stat-val">₹{gtv.toLocaleString('en-IN')}</div>
          <div className="stat-lbl">Gross Volume (GTV)</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon bg-purple">
              <span className="material-icons-outlined" style={{ fontSize: 32, color: '#7c3aed' }}>payments</span>
            </div>
            <span className="stat-trend up">10% commission</span>
          </div>
          <div className="stat-val">₹{platformRev.toLocaleString('en-IN')}</div>
          <div className="stat-lbl">Platform Revenue</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon bg-yellow" style={{ fontSize: 20 }}>⏳</div>
          </div>
          <div className="stat-val" style={{ color: '#d97706' }}>₹{pendingAmt.toLocaleString('en-IN')}</div>
          <div className="stat-lbl">Pending Verification</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon bg-blue" style={{ fontSize: 20 }}>🔢</div>
          </div>
          <div className="stat-val">{verified.length}</div>
          <div className="stat-lbl">Verified Transactions</div>
        </div>
      </div>

      {/* Charts: Revenue Trends + Top Earning Properties */}
      <div className="pay-charts">
        <div className="chart-card">
          <h3>Revenue Trends</h3>
          <p>6-month platform revenue overview</p>
          <div className="line-chart-wrap">
            <svg viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="p-rg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0.03" />
                </linearGradient>
              </defs>
              <polygon points={`${pts} ${areaBot}`} fill="url(#p-rg)" />
              <polyline points={pts} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              {revPoints.map((v, i) => {
                const cx = pad + (i / (revPoints.length - 1)) * (w - pad * 2);
                const cy = h - pad - ((v / revMax) * (h - pad * 2));
                return (
                  <circle key={i} cx={cx} cy={cy} r="3.5" fill="white" stroke="#22c55e" strokeWidth="2">
                    <title>₹{v.toLocaleString()}</title>
                  </circle>
                );
              })}
            </svg>
          </div>
          <div className="chart-labels">
            {months.map(m => <span key={m.key}>{m.label}</span>)}
          </div>
        </div>

        <div className="chart-card">
          <h3>Top Earning Properties</h3>
          <p>Highest commission-generating PGs</p>
          <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topProps.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: 12, padding: '20px 0', textAlign: 'center' }}>No property transactions yet</div>
            ) : (
              topProps.map(([name, amt]) => {
                const pct = Math.round((amt / topMax) * 100);
                return (
                  <div key={name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                      <strong>{name}</strong>
                      <span style={{ color: '#7c3aed', fontWeight: 600 }}>₹{Math.round(amt * 0.10).toLocaleString()} com.</span>
                    </div>
                    <div style={{ background: '#f1f5f9', borderRadius: 4, height: 7, overflow: 'hidden' }}>
                      <div style={{ background: '#2563eb', height: '100%', width: `${pct}%`, borderRadius: 4 }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="tbl-wrap">
        <div className="tbl-hdr">
          <div className="search-wrap">
            <span className="s-ico"><span className="material-icons-outlined" style={{ fontSize: 20 }}>search</span></span>
            <input
              type="text"
              placeholder="Search by tenant, property, or transaction ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, padding: '6px 10px', background: '#dcfce7', borderRadius: 6 }}>
            <span className="material-icons-outlined" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>check</span>
            Showing all transactions
          </span>
        </div>

        <table className="data-tbl">
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Property</th>
              <th>Room</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Transaction ID</th>
              <th>Paid Date</th>
              <th>Status</th>
              <th>Clearance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="10" style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>Loading payments...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="10" style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>No transactions found</td></tr>
            ) : (
              filtered.map(p => {
                const clearance = p.clearance || 'Pending';
                const refundDisabled = !isCleared(p) || !isPaid(p);
                return (
                  <tr key={p.id}>
                    <td><strong>{getName(p.tenant) || 'Guest'}</strong></td>
                    <td style={{ fontSize: 12 }}>{getName(p.property) || '-'}</td>
                    <td><span className="room-chip">{p.room || '-'}</span></td>
                    <td style={{ fontWeight: 600 }}>₹{(Number(p.amount) || 0).toLocaleString()}</td>
                    <td style={{ fontSize: 12 }}>{p.method || 'UPI'}</td>
                    <td style={{ fontSize: 11, color: '#475569' }}>{p.transactionId || '-'}</td>
                    <td style={{ fontSize: 12 }}>{p.paidDate || '-'}</td>
                    <td><span className={`badge badge-${p.status === 'refunded' ? 'cancelled' : p.status || 'pending'}`}>{cap(p.status || 'pending')}</span></td>
                    <td>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: isCleared(p) ? '#dcfce7' : '#fef9c3', color: isCleared(p) ? '#15803d' : '#b45309' }}>
                        {clearance}
                      </span>
                    </td>
                    <td>
                      <div className="act-icons" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        {p.status === 'pending' && (
                          <button
                            className="btn-verify-cred"
                            style={{ background: '#2563eb', color: '#ffffff', padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer' }}
                            onClick={() => handleVerify(p)}
                            title="Verify Payment"
                          >
                            Verify
                          </button>
                        )}
                        <button
                          className="btn-issue-refund"
                          style={{
                            opacity: refundDisabled ? 0.4 : 1,
                            cursor: refundDisabled ? 'not-allowed' : 'pointer',
                            pointerEvents: refundDisabled ? 'none' : 'auto'
                          }}
                          disabled={refundDisabled}
                          onClick={() => handleIssueRefund(p)}
                          title={refundDisabled ? 'Needs a verified, cleared payment' : 'Issue Refund'}
                        >
                          {refundDisabled ? '🔒 Refund' : '↩️ Refund'}
                        </button>
                        <button className="ico-btn view" onClick={() => handleView(p)} title="View"><span className="material-icons-outlined">visibility</span></button>
                        {!['Approved', 'Cleared', 'Refunded'].includes(clearance) && (
                          <button className="ico-btn ok" onClick={() => handleApproveClearance(p)} title="Approve Clearance"><span className="material-icons-outlined">check</span></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal
        show={!!modal}
        onClose={() => setModal(null)}
        title="Payment Details"
        subtitle={modal?.payment ? `Transaction: ${modal.payment.transactionId}` : ''}
        footer={<button className="btn-cancel" onClick={() => setModal(null)}>Close</button>}
      >
        {modal?.payment && (
          <div style={{ display: 'grid', gap: 10, fontSize: 13 }}>
            <div><strong>Tenant:</strong> {getName(modal.payment.tenant)}</div>
            <div><strong>Property:</strong> {getName(modal.payment.property)}</div>
            <div><strong>Room:</strong> {modal.payment.room}</div>
            <div><strong>Amount:</strong> ₹{(Number(modal.payment.amount) || 0).toLocaleString()}</div>
            <div><strong>Platform Commission (10%):</strong> ₹{Math.round((Number(modal.payment.amount) || 0) * 0.10).toLocaleString()}</div>
            <div><strong>Method:</strong> {modal.payment.method || 'UPI'}</div>
            <div><strong>Transaction ID:</strong> {modal.payment.transactionId}</div>
            <div><strong>Status:</strong> <span className={`badge badge-${modal.payment.status}`}>{cap(modal.payment.status)}</span></div>
            <div><strong>Clearance:</strong> {modal.payment.clearance || 'Pending'}</div>
          </div>
        )}
      </Modal>
    </>
  );
}
