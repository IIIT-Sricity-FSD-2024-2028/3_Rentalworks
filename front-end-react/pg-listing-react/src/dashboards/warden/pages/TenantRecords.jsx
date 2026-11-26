import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useWardenData, useWardenRun, useWardenToast } from '../utils/dataStore';
import {
  createTenant,
  deleteTenant,
  escalateTenant,
  evictTenant,
  fetchRentLedger,
  fetchTenantLedger,
  markRentPaidOffline,
  notifyTenant,
  selectBookedTenants,
  selectWardenLedger,
  selectWardenTenantLedger,
  updateTenant,
  waiveRent,
} from '../../../features/warden/wardenSlices';
import Modal from '../components/Modal';

const STATUS_TAGS = {
  paid: { label: '✓ Paid', bg: '#dcfce7', fg: '#15803d' },
  due_soon: { label: '⏳ Due Soon', bg: '#fef3c7', fg: '#b45309' },
  overdue: { label: '⚠ Overdue', bg: '#fee2e2', fg: '#b91c1c' },
  upcoming: { label: 'Upcoming', bg: '#e0e7ff', fg: '#4338ca' },
  waived: { label: 'Waived', bg: '#f1f5f9', fg: '#475569' },
  not_billed: { label: 'Not billed yet', bg: '#f1f5f9', fg: '#475569' },
  no_cycle: { label: 'No cycle', bg: '#f1f5f9', fg: '#475569' },
  evicted: { label: 'Removed', bg: '#fee2e2', fg: '#7f1d1d' },
};

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtD = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const monthOptions = () => {
  const now = new Date();
  const out = [];
  for (let i = -2; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    out.push({ value, label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) });
  }
  return out;
};

const REMINDER_TEMPLATES = [
  { key: 'rent_reminder', label: 'Rent reminder', title: 'Rent payment reminder', message: 'This is a reminder that your monthly rent is due. Please pay from Payments in your dashboard at the earliest.' },
  { key: 'rent_overdue', label: 'Overdue notice', title: 'Rent overdue', message: 'Your rent payment is overdue. Please clear it immediately to avoid further action.' },
  { key: 'rule_notice', label: 'Rule violation notice', title: 'PG rules notice', message: 'We noticed a violation of the PG rules. Please follow the house rules to avoid further action.' },
  { key: 'custom', label: 'Custom message', title: '', message: '' },
];

export default function TenantRecords() {
  const { refreshData, loading } = useWardenData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const months = monthOptions();
  const [month, setMonth] = useState(months[2].value);
  const dispatch = useDispatch();
  const run = useWardenRun();
  const ledger = useSelector(selectWardenLedger);
  const tenantLedger = useSelector(selectWardenTenantLedger);
  const ledgerRows = Array.isArray(ledger.data?.rows) ? ledger.data.rows : [];
  const ledgerLoading = ledger.status === 'loading';

  // Details drawer
  const [drawer, setDrawer] = useState(null); // tenant
  const tenantDues = drawer && Array.isArray(tenantLedger.ledger) ? tenantLedger.ledger : [];
  const auditLogs = drawer ? tenantLedger.audit : [];
  const [action, setAction] = useState(null); // { type, due? }
  const [actionText, setActionText] = useState('');
  const [actionTitle, setActionTitle] = useState('');
  const [template, setTemplate] = useState('rent_reminder');
  
  // Modal states
  const [activeModal, setActiveModal] = useState(null); // 'add', 'view', 'edit', 'delete'
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  

  const showToast = useWardenToast();

  // Only people who have booked a PG appear here.
  const tenants = useSelector(selectBookedTenants);

  const loadLedger = useCallback(async () => {
    const result = await dispatch(fetchRentLedger({ month }));
    if (fetchRentLedger.rejected.match(result)) showToast('error', 'Could not load rent ledger', result.payload);
  }, [dispatch, month, showToast]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  const ledgerByTenant = new Map(ledgerRows.map(r => [Number(r.tenantId), r]));

  // One row per tenant: month status comes from the ledger; removed tenants show their final state.
  const rows = tenants.map(t => {
    const led = ledgerByTenant.get(Number(t.id));
    const evicted = t.status === 'evicted' || t.stayStatus === 'evicted';
    const status = evicted ? 'evicted' : (led?.status || 'no_cycle');
    return { ...t, monthStatus: status, due: led?.due || null };
  });

  const filteredTenants = rows.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      (t.name || '').toLowerCase().includes(q) ||
      String(t.room || '').toLowerCase().includes(q) ||
      (t.pgName || '').toLowerCase().includes(q) ||
      (t.username || '').toLowerCase().includes(q) ||
      (t.phone || '').includes(search);
    const matchStatus = statusFilter === 'all' || t.monthStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const count = (st) => rows.filter(t => t.monthStatus === st).length;
  const paid = count('paid');
  const dueSoon = count('due_soon');
  const overdue = count('overdue');

  const openDrawer = async (tenant) => {
    setDrawer(tenant);
    try {
      await run(fetchTenantLedger(tenant.id));
    } catch (err) {
      showToast('error', 'Could not load tenant ledger', err.message);
    }
  };

  const refreshAll = async (tenant) => {
    await Promise.all([refreshData(), loadLedger()]);
    if (tenant) await openDrawer(tenant);
  };

  const openAction = (type, due = null) => {
    setAction({ type, due });
    setActionText('');
    setActionTitle('');
    if (type === 'notify') {
      const tpl = REMINDER_TEMPLATES[0];
      setTemplate(tpl.key);
      setActionTitle(tpl.title);
      setActionText(tpl.message);
    }
  };

  const pickTemplate = (key) => {
    const tpl = REMINDER_TEMPLATES.find(x => x.key === key) || REMINDER_TEMPLATES[3];
    setTemplate(key);
    setActionTitle(tpl.title);
    setActionText(tpl.message);
  };

  const runAction = async () => {
    if (!action || !drawer || submitting) return;
    const text = actionText.trim();
    const needsText = ['waive', 'evict', 'escalate', 'notify'].includes(action.type);
    if (needsText && !text) {
      showToast('error', 'Required', action.type === 'notify' ? 'Message is required' : 'A reason is required');
      return;
    }
    setSubmitting(true);
    try {
      if (action.type === 'offline') {
        await run(markRentPaidOffline({ dueId: action.due.id, note: text }));
        showToast('success', 'Recorded', 'Marked as paid (cash / offline)');
      } else if (action.type === 'waive') {
        await run(waiveRent({ dueId: action.due.id, reason: text }));
        showToast('success', 'Fee waived', 'The rent for this cycle was waived');
      } else if (action.type === 'notify') {
        await run(notifyTenant({ tenantId: drawer.id, payload: {
          title: actionTitle.trim() || undefined,
          message: text,
          kind: template,
          dueId: action.due?.id,
        } }));
        showToast('success', 'Notification sent', `Sent to ${drawer.name}`);
      } else if (action.type === 'escalate') {
        await run(escalateTenant({ tenantId: drawer.id, payload: {
          message: text,
          category: drawer.monthStatus === 'overdue' ? 'unpaid_rent' : 'violation',
        } }));
        showToast('success', 'Escalated', 'The property owner has been notified');
      } else if (action.type === 'evict') {
        await run(evictTenant({ tenantId: drawer.id, reason: text }));
        showToast('success', 'Tenant removed', 'Bed released and the action was logged');
        setAction(null);
        setDrawer(null);
        await Promise.all([refreshData(), loadLedger()]);
        return;
      }
      const t = drawer;
      setAction(null);
      await refreshAll(t);
    } catch (err) {
      showToast('error', 'Action failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleAdd = async () => {
    if (submitting) return;

    let valid = true;
    const newErrors = {};
    if (!formData.name?.trim()) { newErrors.name = 'Name is required'; valid = false; }
    if (!formData.room?.trim()) { newErrors.room = 'Room number is required'; valid = false; }
    if (!formData.phone || !/^\+?[\d\s-]{9,}$/.test(formData.phone)) { newErrors.phone = 'Enter a valid phone number'; valid = false; }
    if (!formData.checkIn) { newErrors.checkIn = 'Check-in date is required'; valid = false; }
    if (!formData.rent || isNaN(formData.rent) || Number(formData.rent) <= 0) { newErrors.rent = 'Enter a valid rent amount'; valid = false; }
    
    if (!valid) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      await run(createTenant({
        name: formData.name.trim(),
        room: formData.room.trim(),
        phone: formData.phone.trim(),
        checkIn: formData.checkIn,
        rent: parseInt(formData.rent),
        paymentStatus: formData.paymentStatus || 'pending',
      }));

      await Promise.all([refreshData(), loadLedger()]);
      setActiveModal(null);
      showToast('success', 'Tenant records updated');
    } catch (err) {
      showToast('error', 'Error Saving Tenant', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (submitting || !selectedTenant) return;

    let valid = true;
    const newErrors = {};
    if (!formData.room?.trim()) { newErrors.room = 'Room number is required'; valid = false; }
    if (!formData.phone || !/^\+?[\d\s-]{9,}$/.test(formData.phone)) { newErrors.phone = 'Enter a valid phone number'; valid = false; }
    if (!formData.rent || isNaN(formData.rent) || Number(formData.rent) <= 0) { newErrors.rent = 'Enter a valid rent amount'; valid = false; }
    
    if (!valid) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      await run(updateTenant({ id: selectedTenant.id, changes: {
        name: formData.name?.trim() || selectedTenant.name,
        room: formData.room.trim(),
        phone: formData.phone.trim(),
        rent: parseInt(formData.rent),
        paymentStatus: formData.paymentStatus,
      } }));

      await Promise.all([refreshData(), loadLedger()]);
      setActiveModal(null);
      showToast('success', 'Tenant records updated');
    } catch (err) {
      showToast('error', 'Update Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (submitting || !selectedTenant) return;

    setSubmitting(true);
    try {
      await run(deleteTenant(selectedTenant.id));
      await Promise.all([refreshData(), loadLedger()]);
      setActiveModal(null);
      showToast('success', 'Tenant records updated');
    } catch (err) {
      showToast('error', 'Delete Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = (type, tenant = null) => {
    setSelectedTenant(tenant);
    setErrors({});
    if (type === 'add') {
      setFormData({
        paymentStatus: 'pending',
        checkIn: new Date().toISOString().split('T')[0],
        rent: '8000',
      });
    } else if (tenant) {
      setFormData({ ...tenant });
    }
    setActiveModal(type);
  };

  return (
    <section id="tenants-section" className="section active">
      <div className="section-header">
        <h2>Tenant Records</h2>
        <p>View and manage all tenant records</p>
      </div>


      <div className="summary-cards">
        <div className="summary-card">
          <div className="s-label">Tenants</div>
          <div className="s-value">{tenants.length}</div>
        </div>
        <div className="summary-card">
          <div className="s-label">Paid ({months.find(m => m.value === month)?.label})</div>
          <div className="s-value green">{paid}</div>
        </div>
        <div className="summary-card">
          <div className="s-label">Due Soon</div>
          <div className="s-value" style={{ color: '#b45309' }}>{dueSoon}</div>
        </div>
        <div className="summary-card">
          <div className="s-label">Overdue</div>
          <div className="s-value red">{overdue}</div>
        </div>
      </div>

      <div className="table-wrapper">
        <div className="table-header">
          <div className="search-box">
            <span className="search-icon">
              <span className="material-icons-outlined" style={{ fontSize: '18px' }}>search</span>
            </span>
            <input 
              type="text" 
              placeholder="Search by name, PG, room, or contact..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select
              className="filter-select"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              title="Billing month"
            >
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="due_soon">Due Soon</option>
              <option value="overdue">Overdue</option>
              <option value="upcoming">Upcoming</option>
              <option value="evicted">Removed</option>
            </select>
            <button 
              className="btn-login" 
              style={{ width: 'auto', padding: '6px 16px', margin: 0, background: 'var(--primary)' }} 
              onClick={() => openModal('add')}
            >
              + Add Tenant
            </button>
          </div>
        </div>
        
        <table className="data-table">
          <thead>
            <tr>
              <th>Tenant</th>
              <th>PG &amp; Room</th>
              <th>Contact Number</th>
              <th>Check-in Date</th>
              <th>Monthly Rent</th>
              <th>Rent Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTenants.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', color: '#6b7280', padding: '24px' }}>
                {loading || ledgerLoading ? 'Loading tenants...' : 'No tenants found'}
              </td></tr>
            ) : (
              filteredTenants.map(t => {
                const tag = STATUS_TAGS[t.monthStatus] || STATUS_TAGS.no_cycle;
                return (
                  <tr key={t.id}>
                    <td>
                      {t.name}
                      {t.username && <div style={{ fontSize: 11, color: '#6b7280' }}>{t.username}</div>}
                    </td>
                    <td>
                      {t.pgName && <div style={{ fontSize: 13 }}>{t.pgName}</div>}
                      <div style={{ fontSize: 11, color: '#6b7280' }}>
                        Room {[...new Set((t.stays || []).map((st) => st.roomNumber).filter(Boolean))].join(', ') || t.room || '—'}
                      </div>
                    </td>
                    <td>{t.phone}</td>
                    <td>{fmtD(t.checkIn)}</td>
                    <td>
                      {inr(t.due?.amount ?? t.rent)}
                      {t.due?.dueDate && <div style={{ fontSize: 11, color: '#6b7280' }}>due {fmtD(t.due.dueDate)}</div>}
                    </td>
                    <td>
                      <span style={{ background: tag.bg, color: tag.fg, padding: '3px 10px', borderRadius: 99, fontWeight: 700, fontSize: 12 }}>
                        {tag.label}
                      </span>
                    </td>
                    <td>
                      <div className="action-icons">
                        <button className="icon-btn" onClick={() => openDrawer(t)} title="Details & ledger">👁️</button>
                        <button className="icon-btn" onClick={() => openModal('edit', t)} title="Edit">✏️</button>
                        <button className="icon-btn" onClick={() => openModal('delete', t)} title="Delete record">🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      <Modal 
        isOpen={activeModal === 'add'} 
        title="Add New Tenant"
        onCancel={() => setActiveModal(null)}
        onConfirm={handleAdd}
        confirmText={submitting ? 'Saving...' : 'Add Tenant'}
      >
        <div className="form-group">
          <label>Full Name *</label>
          <div className="input-wrapper">
            <input type="text" placeholder="e.g. Rahul Kumar" value={formData.name || ''} onChange={(e) => handleInputChange('name', e.target.value)} />
          </div>
          {errors.name && <div className="error-msg show">{errors.name}</div>}
        </div>
        <div className="form-group">
          <label>Room Number *</label>
          <div className="input-wrapper">
            <input type="text" placeholder="e.g. 101 or 201" value={formData.room || ''} onChange={(e) => handleInputChange('room', e.target.value)} />
          </div>
          {errors.room && <div className="error-msg show">{errors.room}</div>}
        </div>
        <div className="form-group">
          <label>Phone Number *</label>
          <div className="input-wrapper">
            <input type="text" placeholder="+91 98765 43210" value={formData.phone || ''} onChange={(e) => handleInputChange('phone', e.target.value)} />
          </div>
          {errors.phone && <div className="error-msg show">{errors.phone}</div>}
        </div>
        <div className="form-group">
          <label>Check-In Date *</label>
          <div className="input-wrapper">
            <input type="date" value={formData.checkIn || ''} onChange={(e) => handleInputChange('checkIn', e.target.value)} />
          </div>
          {errors.checkIn && <div className="error-msg show">{errors.checkIn}</div>}
        </div>
        <div className="form-group">
          <label>Monthly Rent (₹) *</label>
          <div className="input-wrapper">
            <input type="number" placeholder="e.g. 8000" min="0" value={formData.rent || ''} onChange={(e) => handleInputChange('rent', e.target.value)} />
          </div>
          {errors.rent && <div className="error-msg show">{errors.rent}</div>}
        </div>
        <div className="form-group">
          <label>Payment Status</label>
          <select className="filter-select" style={{ width: '100%' }} value={formData.paymentStatus || 'pending'} onChange={(e) => handleInputChange('paymentStatus', e.target.value)}>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal 
        isOpen={activeModal === 'edit'} 
        title={`Edit Tenant: ${selectedTenant?.name || ''}`}
        onCancel={() => setActiveModal(null)}
        onConfirm={handleEdit}
        confirmText={submitting ? 'Saving...' : 'Save Changes'}
      >
        <div className="form-group">
          <label>Room Number *</label>
          <div className="input-wrapper">
            <input type="text" placeholder="Room No" value={formData.room || ''} onChange={(e) => handleInputChange('room', e.target.value)} />
          </div>
          {errors.room && <div className="error-msg show">{errors.room}</div>}
        </div>
        <div className="form-group">
          <label>Phone Number *</label>
          <div className="input-wrapper">
            <input type="text" placeholder="Phone" value={formData.phone || ''} onChange={(e) => handleInputChange('phone', e.target.value)} />
          </div>
          {errors.phone && <div className="error-msg show">{errors.phone}</div>}
        </div>
        <div className="form-group">
          <label>Monthly Rent (₹) *</label>
          <div className="input-wrapper">
            <input type="number" placeholder="Rent" min="0" value={formData.rent || ''} onChange={(e) => handleInputChange('rent', e.target.value)} />
          </div>
          {errors.rent && <div className="error-msg show">{errors.rent}</div>}
        </div>
        <div className="form-group">
          <label>Payment Status</label>
          <select className="filter-select" style={{ width: '100%' }} value={formData.paymentStatus || 'pending'} onChange={(e) => handleInputChange('paymentStatus', e.target.value)}>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal 
        isOpen={activeModal === 'delete'} 
        title="Delete Tenant"
        onCancel={() => setActiveModal(null)}
        onConfirm={handleDelete}
        confirmText={submitting ? 'Deleting...' : 'Delete'}
      >
        {selectedTenant && (
          <p style={{ fontSize: '14px', color: '#374151' }}>
            Are you sure you want to remove <strong>{selectedTenant.name}</strong> (Room {selectedTenant.room})? This action cannot be undone.
          </p>
        )}
      </Modal>

      {/* Tenant details drawer */}
      {drawer && (
        <div className="tr-drawer-backdrop" onClick={() => setDrawer(null)}>
          <aside className="tr-drawer" onClick={(e) => e.stopPropagation()}>
            <header className="tr-drawer-head">
              <div className="tr-avatar">{String(drawer.name || '?').charAt(0).toUpperCase()}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h3>{drawer.name}</h3>
                <div className="tr-sub">{drawer.username}{drawer.email ? ` · ${drawer.email}` : ''}</div>
              </div>
              <button className="tr-close" onClick={() => setDrawer(null)} aria-label="Close">
                <span className="material-icons-outlined">close</span>
              </button>
            </header>

            <div className="tr-facts">
              <div><span>PG</span><strong>{drawer.pgName || '—'}</strong></div>
              <div><span>Room</span><strong>{[...new Set((drawer.stays || []).map((st) => st.roomNumber).filter(Boolean))].join(', ') || drawer.room || '—'}</strong></div>
              <div><span>Phone</span><strong>{drawer.phone || '—'}</strong></div>
              <div><span>Check-in</span><strong>{fmtD(drawer.checkIn)}</strong></div>
              <div><span>Monthly rent</span><strong>{inr(drawer.rent)}</strong></div>
              <div><span>Status</span><strong style={{ textTransform: 'capitalize' }}>{drawer.status === 'evicted' ? 'Removed' : drawer.status}</strong></div>
              {drawer.endedAt && <div><span>Left on</span><strong>{fmtD(drawer.endedAt)}</strong></div>}
            </div>
            {drawer.endReason && <div className="tr-note"><strong>Reason:</strong> {drawer.endReason}</div>}

            {drawer.bookingPayment && (
              <section className="tr-card">
                <h4>Paid at booking</h4>
                <div className="tr-row"><span>Total paid</span><strong>{inr(drawer.bookingPayment.amount)}</strong></div>
                <div className="tr-row"><span>Base rent</span><span>{inr(drawer.bookingPayment.rentAmount)}</span></div>
                <div className="tr-row"><span>Deposit &amp; maintenance</span><span>{inr(Number(drawer.bookingPayment.amount) - Number(drawer.bookingPayment.rentAmount || 0))}</span></div>
                <div className="tr-muted">Txn {drawer.bookingPayment.transactionId} · {String(drawer.bookingPayment.method || '').toUpperCase()}</div>
              </section>
            )}

            <h4 className="tr-title">Rent ledger</h4>
            {tenantDues.length === 0 ? (
              <div className="tr-muted">No rent cycles yet.</div>
            ) : (
              <div className="tr-ledger">
                {tenantDues.map((d) => {
                  const st = d.effectiveStatus || d.status;
                  const tag = STATUS_TAGS[st] || STATUS_TAGS.upcoming;
                  const open = ['upcoming', 'due_soon', 'overdue'].includes(st);
                  return (
                    <div className="tr-due" key={d.id}>
                      <div className="tr-due-top">
                        <div>
                          <div className="tr-due-period">{fmtD(d.periodStart)} – {fmtD(d.periodEnd)}</div>
                          <div className="tr-muted">Due {fmtD(d.dueDate)}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="tr-due-amt">{inr(d.amount)}</div>
                          <span className="tr-tag" style={{ background: tag.bg, color: tag.fg }}>{tag.label}</span>
                        </div>
                      </div>
                      {open && drawer.status !== 'evicted' && (
                        <div className="tr-due-actions">
                          <button className="btn-confirm" onClick={() => openAction('offline', d)}>Mark paid (cash)</button>
                          <button className="btn-cancel" onClick={() => openAction('waive', d)}>Waive fee</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {drawer.status !== 'evicted' && (
              <div className="tr-actions">
                <button className="btn-confirm" onClick={() => openAction('notify', tenantDues.find(d => ['due_soon', 'overdue'].includes(d.effectiveStatus || d.status)) || null)}>
                  <span className="material-icons-outlined">notifications</span> Send reminder
                </button>
                <button className="btn-cancel" onClick={() => openAction('escalate')}>
                  <span className="material-icons-outlined">outgoing_mail</span> Escalate to owner
                </button>
                <button className="btn-cancel tr-danger" onClick={() => openAction('evict')}>
                  <span className="material-icons-outlined">person_remove</span> Remove tenant
                </button>
              </div>
            )}

            <h4 className="tr-title">Audit history</h4>
            {auditLogs.length === 0 ? (
              <div className="tr-muted">No actions logged yet.</div>
            ) : (
              <ul className="tr-audit">
                {auditLogs.map(l => (
                  <li key={l.id}>
                    <strong>{String(l.action).replace(/evict/gi, 'remove').replace(/_/g, ' ')}</strong>
                    <span className="tr-muted"> · {l.actorName || l.actorRole || 'system'} · {fmtD(l.createdAt)}</span>
                    {l.reason && <div>{l.reason}</div>}
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      )}

      {/* Action modal (notify / escalate / evict / waive / offline) */}
      <Modal
        isOpen={!!action}
        title={
          action?.type === 'notify' ? `Notify ${drawer?.name || ''}` :
          action?.type === 'escalate' ? 'Escalate to Property Owner' :
          action?.type === 'evict' ? 'Remove Tenant' :
          action?.type === 'waive' ? 'Waive Fee' : 'Mark Paid (Cash)'
        }
        onCancel={() => setAction(null)}
        onConfirm={runAction}
        confirmText={submitting ? 'Working...' : action?.type === 'evict' ? 'Remove tenant' : 'Confirm'}
      >
        {action?.type === 'notify' && (
          <div className="form-group">
            <label>Template</label>
            <select className="filter-select" style={{ width: '100%' }} value={template} onChange={(e) => pickTemplate(e.target.value)}>
              {REMINDER_TEMPLATES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            <label style={{ marginTop: 10, display: 'block' }}>Title</label>
            <div className="input-wrapper"><input type="text" value={actionTitle} onChange={(e) => setActionTitle(e.target.value)} /></div>
          </div>
        )}
        {action?.type === 'evict' && (
          <p style={{ fontSize: 13, color: '#b91c1c' }}>
            This releases the bed of <strong>{drawer?.name}</strong> (Room {drawer?.room}{drawer?.bedNumber ? `, Bed ${drawer.bedNumber}` : ''}), blocks their login, waives unpaid future rent and notifies the owner. It is recorded in the audit history.
          </p>
        )}
        {action?.type === 'offline' && action.due && (
          <p style={{ fontSize: 13 }}>Record {inr(action.due.amount)} received in cash for {fmtD(action.due.periodStart)} – {fmtD(action.due.periodEnd)}. Add an optional note:</p>
        )}
        <div className="form-group">
          <label>
            {action?.type === 'notify' ? 'Message *' :
             action?.type === 'offline' ? 'Note (optional)' :
             action?.type === 'escalate' ? 'Message to owner *' : 'Reason *'}
          </label>
          <textarea
            rows={4}
            style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
            value={actionText}
            onChange={(e) => setActionText(e.target.value)}
            placeholder={action?.type === 'evict' ? 'e.g. Rent unpaid for 45 days after repeated reminders' : ''}
          />
        </div>
      </Modal>

    </section>
  );
}
