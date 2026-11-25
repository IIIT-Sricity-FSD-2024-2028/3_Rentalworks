import React, { useState, useEffect, useCallback } from 'react';
import { useWardenData } from '../utils/dataStore';
import {
  createTenantApi, updateTenantApi, deleteTenantApi,
  getRentLedgerApi, getTenantLedgerApi, markRentPaidOfflineApi, waiveRentApi,
  notifyTenantApi, escalateTenantApi, evictTenantApi, getAuditLogsApi,
} from '../utils/api';
import Modal from '../components/Modal';

const STATUS_TAGS = {
  paid: { label: '✓ Paid', bg: '#dcfce7', fg: '#15803d' },
  due_soon: { label: '⏳ Due Soon', bg: '#fef3c7', fg: '#b45309' },
  overdue: { label: '⚠ Overdue', bg: '#fee2e2', fg: '#b91c1c' },
  upcoming: { label: 'Upcoming', bg: '#e0e7ff', fg: '#4338ca' },
  waived: { label: 'Waived', bg: '#f1f5f9', fg: '#475569' },
  not_billed: { label: 'Not billed yet', bg: '#f1f5f9', fg: '#475569' },
  no_cycle: { label: 'No cycle', bg: '#f1f5f9', fg: '#475569' },
  evicted: { label: 'Evicted', bg: '#fee2e2', fg: '#7f1d1d' },
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
  const { data, refreshData, loading } = useWardenData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const months = monthOptions();
  const [month, setMonth] = useState(months[2].value);
  const [ledgerRows, setLedgerRows] = useState([]);
  const [ledgerSummary, setLedgerSummary] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Details drawer
  const [drawer, setDrawer] = useState(null); // tenant
  const [tenantDues, setTenantDues] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
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
  
  // Toast state
  const [toast, setToast] = useState(null);

  const showToast = (type, title, message) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 3500);
  };

  const tenants = data.tenants || [];

  const loadLedger = useCallback(async () => {
    setLedgerLoading(true);
    try {
      const res = await getRentLedgerApi(month);
      setLedgerRows(Array.isArray(res?.rows) ? res.rows : []);
      setLedgerSummary(res?.summary || null);
    } catch (err) {
      setLedgerRows([]);
      setLedgerSummary(null);
      showToast('error', 'Could not load rent ledger', err.message);
    } finally {
      setLedgerLoading(false);
    }
  }, [month]);

  useEffect(() => { loadLedger(); }, [loadLedger]);

  const ledgerByTenant = new Map(ledgerRows.map(r => [Number(r.tenantId), r]));

  // One row per tenant: month status comes from the ledger; evicted tenants show their final state.
  const rows = tenants.map(t => {
    const led = ledgerByTenant.get(Number(t.id));
    const evicted = t.status === 'evicted' || t.stayStatus === 'evicted';
    const status = evicted ? 'evicted' : (led?.status || (t.stayStatus === 'active' ? 'no_cycle' : 'no_cycle'));
    return { ...t, monthStatus: status, due: led?.due || null };
  });

  const filteredTenants = rows.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      (t.name || '').toLowerCase().includes(q) ||
      String(t.room || '').toLowerCase().includes(q) ||
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
    setTenantDues([]);
    setAuditLogs([]);
    try {
      const [dues, logs] = await Promise.all([
        getTenantLedgerApi(tenant.id),
        getAuditLogsApi({ tenantId: tenant.id }).catch(() => []),
      ]);
      setTenantDues(Array.isArray(dues) ? dues : []);
      setAuditLogs(Array.isArray(logs) ? logs : []);
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
        await markRentPaidOfflineApi(action.due.id, text);
        showToast('success', 'Recorded', 'Marked as paid (cash / offline)');
      } else if (action.type === 'waive') {
        await waiveRentApi(action.due.id, text);
        showToast('success', 'Fee waived', 'The rent for this cycle was waived');
      } else if (action.type === 'notify') {
        await notifyTenantApi(drawer.id, {
          title: actionTitle.trim() || undefined,
          message: text,
          kind: template,
          dueId: action.due?.id,
        });
        showToast('success', 'Notification sent', `Sent to ${drawer.name}`);
      } else if (action.type === 'escalate') {
        await escalateTenantApi(drawer.id, {
          message: text,
          category: drawer.monthStatus === 'overdue' ? 'unpaid_rent' : 'violation',
        });
        showToast('success', 'Escalated', 'The property owner has been notified');
      } else if (action.type === 'evict') {
        await evictTenantApi(drawer.id, text);
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
    if (!formData.phone || !/^\+?[\d\s\-]{9,}$/.test(formData.phone)) { newErrors.phone = 'Enter a valid phone number'; valid = false; }
    if (!formData.checkIn) { newErrors.checkIn = 'Check-in date is required'; valid = false; }
    if (!formData.rent || isNaN(formData.rent) || Number(formData.rent) <= 0) { newErrors.rent = 'Enter a valid rent amount'; valid = false; }
    
    if (!valid) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      await createTenantApi({
        name: formData.name.trim(),
        room: formData.room.trim(),
        phone: formData.phone.trim(),
        checkIn: formData.checkIn,
        rent: parseInt(formData.rent),
        paymentStatus: formData.paymentStatus || 'pending',
      });

      await refreshData();
      setActiveModal(null);
      showToast('success', 'Changes Saved', 'Changes saved');
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
    if (!formData.phone || !/^\+?[\d\s\-]{9,}$/.test(formData.phone)) { newErrors.phone = 'Enter a valid phone number'; valid = false; }
    if (!formData.rent || isNaN(formData.rent) || Number(formData.rent) <= 0) { newErrors.rent = 'Enter a valid rent amount'; valid = false; }
    
    if (!valid) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      await updateTenantApi(selectedTenant.id, {
        name: formData.name?.trim() || selectedTenant.name,
        room: formData.room.trim(),
        phone: formData.phone.trim(),
        rent: parseInt(formData.rent),
        paymentStatus: formData.paymentStatus,
      });

      await refreshData();
      setActiveModal(null);
      showToast('success', 'Changes Saved', 'Changes saved');
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
      await deleteTenantApi(selectedTenant.id);
      await refreshData();
      setActiveModal(null);
      showToast('success', 'Changes Saved', 'Changes saved');
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
          <div className="s-label">Total Tenants</div>
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
              placeholder="Search by name, room, or contact..." 
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
              <option value="evicted">Evicted</option>
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
              <th>Room &amp; Bed</th>
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
                    <td><span className="room-badge">{t.room}{t.bedNumber ? ` • ${t.bedNumber}` : ''}</span></td>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 9000 }} onClick={() => setDrawer(null)}>
          <aside
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(520px, 100%)', background: '#fff', overflowY: 'auto', padding: 24, boxShadow: '-8px 0 30px rgba(0,0,0,.15)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: 0 }}>{drawer.name}</h3>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{drawer.username} • {drawer.email}</div>
              </div>
              <button className="icon-btn" onClick={() => setDrawer(null)} aria-label="Close">✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13, marginTop: 16 }}>
              <div><strong>Room &amp; Bed:</strong> {drawer.room}{drawer.bedNumber ? ` / Bed ${drawer.bedNumber}` : ''}</div>
              <div><strong>Phone:</strong> {drawer.phone || '—'}</div>
              <div><strong>Check-in:</strong> {fmtD(drawer.checkIn)}</div>
              <div><strong>Monthly rent:</strong> {inr(drawer.rent)}</div>
              <div><strong>Status:</strong> {drawer.status}</div>
              {drawer.endedAt && <div><strong>Left on:</strong> {fmtD(drawer.endedAt)}</div>}
            </div>
            {drawer.endReason && <div style={{ fontSize: 13, marginTop: 8 }}><strong>Reason:</strong> {drawer.endReason}</div>}

            {drawer.bookingPayment && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginTop: 16, fontSize: 13 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Paid at booking</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Total paid</span><strong>{inr(drawer.bookingPayment.amount)}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Base rent</span><span>{inr(drawer.bookingPayment.rentAmount)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Deposit &amp; maintenance</span><span>{inr(Number(drawer.bookingPayment.amount) - Number(drawer.bookingPayment.rentAmount || 0))}</span></div>
                <div style={{ color: '#6b7280', fontSize: 11, marginTop: 4 }}>Txn {drawer.bookingPayment.transactionId} • {String(drawer.bookingPayment.method || '').toUpperCase()}</div>
              </div>
            )}

            <h4 style={{ margin: '20px 0 8px' }}>Rent ledger</h4>
            <table className="data-table" style={{ fontSize: 12 }}>
              <thead><tr><th>Period</th><th>Due</th><th>Amount</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {tenantDues.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', color: '#6b7280' }}>No cycles yet</td></tr>
                ) : tenantDues.map(d => {
                  const st = d.effectiveStatus || d.status;
                  const tag = STATUS_TAGS[st] || STATUS_TAGS.upcoming;
                  const open = ['upcoming', 'due_soon', 'overdue'].includes(st);
                  return (
                    <tr key={d.id}>
                      <td>{fmtD(d.periodStart)} – {fmtD(d.periodEnd)}</td>
                      <td>{fmtD(d.dueDate)}</td>
                      <td>{inr(d.amount)}</td>
                      <td><span style={{ background: tag.bg, color: tag.fg, padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>{tag.label}</span></td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {open && drawer.status !== 'evicted' && (
                          <>
                            <button className="btn-confirm" style={{ padding: '3px 8px', fontSize: 11, marginRight: 4 }} onClick={() => openAction('offline', d)}>[ Mark Cash / Offline Paid ]</button>
                            <button className="btn-cancel" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => openAction('waive', d)}>[ Waive / Excuse Fee ]</button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {drawer.status !== 'evicted' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
                <button className="btn-confirm" onClick={() => openAction('notify', tenantDues.find(d => ['due_soon', 'overdue'].includes(d.effectiveStatus || d.status)) || null)}>Send notification / reminder</button>
                <button className="btn-cancel" onClick={() => openAction('escalate')}>Escalate to Owner</button>
                <button className="btn-cancel" style={{ color: '#b91c1c', borderColor: '#b91c1c' }} onClick={() => openAction('evict')}>[ Evict / Remove Tenant ]</button>
              </div>
            )}

            <h4 style={{ margin: '22px 0 8px' }}>Audit history</h4>
            {auditLogs.length === 0 ? (
              <div style={{ fontSize: 12, color: '#6b7280' }}>No actions logged yet.</div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12 }}>
                {auditLogs.map(l => (
                  <li key={l.id} style={{ borderLeft: '3px solid #cbd5e1', padding: '4px 10px', marginBottom: 8 }}>
                    <strong>{String(l.action).replace(/_/g, ' ')}</strong>
                    <span style={{ color: '#6b7280' }}> • {l.actorName || l.actorRole || 'system'} • {fmtD(l.createdAt)}</span>
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
          action?.type === 'evict' ? 'Evict / Remove Tenant' :
          action?.type === 'waive' ? 'Waive / Excuse Fee' : 'Mark Cash / Offline Paid'
        }
        onCancel={() => setAction(null)}
        onConfirm={runAction}
        confirmText={submitting ? 'Working...' : action?.type === 'evict' ? 'Confirm removal' : 'Confirm'}
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

      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type} show`}>
          <span className="toast-icon">
            <span className="material-icons-outlined" style={{ fontSize: '24px' }}>
              {toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'cancel' : 'info'}
            </span>
          </span>
          <div className="toast-text">
            <strong>{toast.title}</strong>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </section>
  );
}
