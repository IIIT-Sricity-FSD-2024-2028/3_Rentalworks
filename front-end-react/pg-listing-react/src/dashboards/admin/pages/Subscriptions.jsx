import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { runThunk } from '../../../app/hooks';
import { adminUsers, adminSubscriptions, selectAdminSubscriptions, selectAdminSubscriptionStats } from '../../../features/admin/adminSlices';
import { SUBSCRIPTION_PLANS } from '../../../data/catalog';
import Modal from '../components/Modal';

const BILLING = { MONTHLY: 'Monthly', YEARLY: 'Yearly', LIFETIME: 'One-time' };

export default function Subscriptions() {
  const dispatch = useDispatch();
  const subscriptions = useSelector(selectAdminSubscriptions);
  const { subscriptions: counts, payments } = useSelector(selectAdminSubscriptionStats);
  const stats = { ...counts, totalRevenue: payments.totalRevenue };
  const isLoading = useSelector(adminUsers.selectors.selectIsLoading);
  const loading = isLoading && subscriptions.length === 0;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [receiptModal, setReceiptModal] = useState(null);
  // { sub, planType } while assigning / changing a plan; { sub, cancel: true } while cancelling.
  const [planModal, setPlanModal] = useState(null);
  const saving = useSelector(adminSubscriptions.selectors.selectMutating);

  useEffect(() => {
    dispatch(adminUsers.thunks.fetchAll());
    dispatch(adminSubscriptions.thunks.fetchAll());
  }, [dispatch]);

  const loadData = async () => {
    await dispatch(adminUsers.thunks.fetchAll());
    return runThunk(dispatch, adminSubscriptions.thunks.fetchAll(), { success: 'Subscriptions refreshed' });
  };

  /** Activate a new plan (POST) or cancel the current one (PATCH status). The server sets price and dates. */
  const savePlan = async () => {
    const { sub } = planModal;
    const action = planModal.cancel
      ? adminSubscriptions.thunks.updateItem({ id: sub.subscriptionId, changes: { status: 'cancelled' } })
      : adminSubscriptions.thunks.createItem({ ownerId: sub.ownerId, planType: planModal.planType });
    const name = sub.owner?.name || 'owner';
    const { ok } = await runThunk(dispatch, action, {
      success: planModal.cancel ? `Plan cancelled for ${name}` : `${planModal.planType.charAt(0) + planModal.planType.slice(1).toLowerCase()} plan activated for ${name}`,
    });
    if (ok) {
      await Promise.all([dispatch(adminSubscriptions.thunks.fetchAll()), dispatch(adminUsers.thunks.fetchAll())]);
      setPlanModal(null);
    }
  };

  const filtered = subscriptions.filter(sub => {
    const ownerName = (sub.owner?.name || '').toLowerCase();
    const ownerEmail = (sub.owner?.email || '').toLowerCase();
    const receipt = (sub.receiptNumber || '').toLowerCase();
    const q = search.toLowerCase().trim();
    const matchesSearch = !q || ownerName.includes(q) || ownerEmail.includes(q) || receipt.includes(q);

    const subStatus = sub.evaluatedStatus || sub.status || 'ACTIVE';
    const matchesStatus = statusFilter === 'ALL' || subStatus === statusFilter;
    const matchesPlan = planFilter === 'ALL' || sub.planType === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  const totalActive = stats.totalActive || 1;
  const yPct = Math.round(((stats.yearly || 0) / totalActive) * 100);
  const mPct = Math.round(((stats.monthly || 0) / totalActive) * 100);
  const lPct = Math.round(((stats.lifetime || 0) / totalActive) * 100);

  const handleViewReceipt = (ownerId) => {
    const sub = subscriptions.find(x => x.ownerId === ownerId);
    if (sub) setReceiptModal({ ...sub, planName: sub.plan.displayName });
  };

  return (
    <>
      <div className="sec-hdr" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Owner Subscriptions</h2>
          <p>Manage and monitor all PG owner subscription plans, active tiers, and billing status</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-add" onClick={loadData}>
            <span className="material-icons-outlined" style={{ fontSize: 18 }}>refresh</span> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards: Glass Morphism matching Payments Tab */}
      <div className="pay-summary">
        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon bg-green"><span className="material-icons-outlined" style={{ fontSize: 24, color: '#16a34a' }}>workspace_premium</span></div>
            <span className="stat-trend up">Active Tiers</span>
          </div>
          <div className="stat-val">{stats.totalActive}</div>
          <div className="stat-lbl">Active Subscriptions</div>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon bg-blue"><span className="material-icons-outlined" style={{ fontSize: 24, color: '#2563eb' }}>calendar_view_month</span></div>
            <span className="stat-trend">₹499/mo</span>
          </div>
          <div className="stat-val">{stats.monthly}</div>
          <div className="stat-lbl">Monthly Plans</div>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon bg-purple"><span className="material-icons-outlined" style={{ fontSize: 24, color: '#7c3aed' }}>event_repeat</span></div>
            <span className="stat-trend up">Most Popular</span>
          </div>
          <div className="stat-val">{stats.yearly}</div>
          <div className="stat-lbl">Yearly Plans</div>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon bg-yellow"><span className="material-icons-outlined" style={{ fontSize: 24, color: '#d97706' }}>all_inclusive</span></div>
            <span className="stat-trend up">Best Value</span>
          </div>
          <div className="stat-val">{stats.lifetime}</div>
          <div className="stat-lbl">Lifetime Plans</div>
        </div>
      </div>

      {/* Visual Charts Row */}
      <div className="pay-charts" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 20 }}>
        <div className="chart-card">
          <h3>Subscription Plan Distribution</h3>
          <p>Active subscriptions broken down by tier</p>
          <div style={{ padding: '14px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span><strong>Yearly Plan (₹4,999)</strong></span>
                <span>{stats.yearly} ({yPct}%)</span>
              </div>
              <div style={{ background: '#f1f5f9', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                <div style={{ background: '#2563eb', height: '100%', width: `${yPct}%`, transition: 'width 0.4s ease' }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span><strong>Monthly Plan (₹499)</strong></span>
                <span>{stats.monthly} ({mPct}%)</span>
              </div>
              <div style={{ background: '#f1f5f9', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                <div style={{ background: '#10b981', height: '100%', width: `${mPct}%`, transition: 'width 0.4s ease' }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span><strong>Lifetime Plan (₹14,999)</strong></span>
                <span>{stats.lifetime} ({lPct}%)</span>
              </div>
              <div style={{ background: '#f1f5f9', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                <div style={{ background: '#8b5cf6', height: '100%', width: `${lPct}%`, transition: 'width 0.4s ease' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="chart-card">
          <h3>Subscription Revenue Overview</h3>
          <p>Estimated annual subscription run-rate</p>
          <div style={{ padding: '14px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#0f172a' }}>
              ₹{Number(stats.totalRevenue).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Total Current Active Value</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 16 }}>
              <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, padding: '6px 12px', background: '#dcfce7', borderRadius: 20 }}>
                ✓ Real-time Verified
              </span>
              <span style={{ fontSize: 12, color: '#2563eb', fontWeight: 600, padding: '6px 12px', background: '#eff6ff', borderRadius: 20 }}>
                ⚡ 100% Platform Retained
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="tbl-wrap">
        <div className="tbl-hdr">
          <div className="search-wrap">
            <span className="s-ico"><span className="material-icons-outlined" style={{ fontSize: 20 }}>search</span></span>
            <input
              type="text"
              placeholder="Search by owner name, email, or receipt..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="sel" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <select className="sel" value={planFilter} onChange={e => setPlanFilter(e.target.value)}>
            <option value="ALL">All Plans</option>
            <option value="MONTHLY">Monthly</option>
            <option value="YEARLY">Yearly</option>
            <option value="LIFETIME">Lifetime</option>
          </select>
          <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, padding: '6px 10px', background: '#dcfce7', borderRadius: 6 }}>
            <span className="material-icons-outlined" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>check_circle</span>
            Live Subscriptions
          </span>
        </div>

        <table className="data-tbl">
          <thead>
            <tr>
              <th>Owner</th>
              <th>Plan Type</th>
              <th>Amount</th>
              <th>Start Date</th>
              <th>Expiry Date</th>
              <th>Status</th>
              <th>Receipt No</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>
                  Loading subscriptions...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>
                  No matching subscriptions found.
                </td>
              </tr>
            ) : (
              filtered.map(s => {
                const subStatus = s.evaluatedStatus || s.status || 'ACTIVE';
                let badgeColor = { background: '#ecfdf5', color: '#15803d' };
                if (subStatus === 'EXPIRED') badgeColor = { background: '#fef2f2', color: '#b91c1c' };
                if (subStatus === 'CANCELLED') badgeColor = { background: '#f1f5f9', color: '#64748b' };

                const isLifetime = s.planType === 'LIFETIME';
                const expiryText = isLifetime ? (
                  <span style={{ color: '#10b981', fontWeight: 600 }}>Lifetime (Never)</span>
                ) : (
                  s.endDate || '—'
                );

                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{s.owner?.name || 'Owner #' + (s.ownerId || s.id)}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>{s.owner?.email || ''}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontWeight: 600, color: '#1e40af' }}>{s.plan?.displayName || s.planType}</span>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>
                      ₹{Number(s.amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#475569', fontSize: 13 }}>{s.startDate || '-'}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13 }}>{expiryText}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, ...badgeColor }}>
                        {subStatus}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>
                      {s.receiptNumber || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        className="btn-action-small"
                        onClick={() => setPlanModal({ sub: s, planType: s.status === 'ACTIVE' && SUBSCRIPTION_PLANS.some((p) => p.name === s.planType) ? s.planType : 'MONTHLY' })}
                        style={{ padding: '4px 10px', background: '#ecfdf5', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer', marginRight: 6 }}
                      >
                        {s.status === 'ACTIVE' ? 'Change plan' : 'Activate plan'}
                      </button>
                      {s.status === 'ACTIVE' && (
                        <button
                          className="btn-action-small"
                          onClick={() => setPlanModal({ sub: s, cancel: true })}
                          style={{ padding: '4px 10px', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer', marginRight: 6 }}
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        className="btn-action-small"
                        disabled={!s.receiptNumber}
                        onClick={() => handleViewReceipt(s.ownerId)}
                        style={{
                          padding: '4px 10px',
                          background: '#eff6ff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe',
                          borderRadius: 6,
                          fontWeight: 600,
                          fontSize: 11,
                          cursor: 'pointer'
                        }}
                      >
                        View Receipt
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Activate / change / cancel plan */}
      <Modal
        show={!!planModal}
        onClose={() => setPlanModal(null)}
        title={planModal?.cancel ? 'Cancel subscription' : planModal?.sub?.status === 'ACTIVE' ? 'Change plan' : 'Activate plan'}
        subtitle={planModal ? `${planModal.sub.owner?.name || 'Owner'} · ${planModal.sub.owner?.email || ''}` : ''}
        footer={
          <>
            <button className="btn-cancel" onClick={() => setPlanModal(null)}>Close</button>
            <button className={planModal?.cancel ? 'btn-confirm-red' : 'btn-confirm-blue'} disabled={saving} onClick={savePlan}>
              {planModal?.cancel ? 'Cancel plan' : 'Activate'}
            </button>
          </>
        }
      >
        {planModal?.cancel ? (
          <p style={{ fontSize: 13, color: '#475569' }}>
            {planModal.sub.plan?.displayName} will end now. The owner is notified and their portal shows no active plan.
          </p>
        ) : (
          planModal && (
            <div style={{ display: 'grid', gap: 8 }}>
              {SUBSCRIPTION_PLANS.map((p) => (
                <label key={p.name} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 10, border: `1px solid ${planModal.planType === p.name ? '#2563eb' : '#e2e8f0'}`, borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                  <input type="radio" name="plan" checked={planModal.planType === p.name} onChange={() => setPlanModal({ ...planModal, planType: p.name })} />
                  <span style={{ flex: 1 }}>
                    <strong>{p.displayName}</strong> — ₹{p.price.toLocaleString('en-IN')} {p.durationMonths === 1 ? 'per month' : p.durationMonths ? `for ${p.durationMonths} months` : 'one-time'}
                  </span>
                </label>
              ))}
              <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                Starts today. {planModal.sub.status === 'ACTIVE' ? 'The current plan is closed and replaced.' : ''} The owner is notified.
              </p>
            </div>
          )
        )}
      </Modal>

      {/* Receipt Modal */}
      <Modal
        show={!!receiptModal}
        onClose={() => setReceiptModal(null)}
        title="🧾 Subscription Receipt"
        subtitle={`Receipt: ${receiptModal?.receiptNumber || 'N/A'}`}
        footer={<button className="btn-cancel" onClick={() => setReceiptModal(null)}>Close</button>}
      >
        {receiptModal && (
          <div style={{ padding: '10px 0', fontSize: 13, display: 'grid', gap: 12 }}>
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#64748b' }}>Plan Subscribed:</span>
                <strong>{receiptModal.planName || receiptModal.planType}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#64748b' }}>Amount Paid:</span>
                <strong style={{ color: '#16a34a' }}>₹{Number(receiptModal.amount).toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#64748b' }}>Billing Cycle:</span>
                <span>{BILLING[receiptModal.planType] || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#64748b' }}>Start Date:</span>
                <span>{receiptModal.startDate || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Plan Status:</span>
                <span style={{ color: '#16a34a', fontWeight: 700 }}>{receiptModal.status}</span>
              </div>
            </div>
            <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
              This is a computer-generated receipt for RentBro Platform subscription services.
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}
