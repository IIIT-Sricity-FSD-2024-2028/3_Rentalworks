import React, { useState } from 'react';
import { useWardenData } from '../utils/dataStore';
import Modal from '../components/Modal';
import {
  createRuleViolationApi,
  issueRuleViolationWarningApi,
  escalateRuleViolationApi,
  deleteRuleViolationApi,
} from '../utils/api';

export default function RuleViolations() {
  const { data, refreshData } = useWardenData();
  const [filter, setFilter] = useState('all');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);

  const violations = data.violations || [];
  const tenants = data.tenants || [];

  const showToast = (type, title, message) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 3500);
  };

  const filteredViolations = filter === 'all' 
    ? violations 
    : violations.filter(v => v.severity === filter);

  const total = violations.length;
  const high = violations.filter(v => v.severity === 'high').length;
  const medium = violations.filter(v => v.severity === 'medium').length;
  const low = violations.filter(v => v.severity === 'low').length;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: null }));
  };

  const openAddViolationModal = () => {
    setFormData({ severity: 'low' });
    setErrors({});
    setIsAddModalOpen(true);
  };

  const handleAddViolation = async () => {
    let valid = true;
    const newErrors = {};

    if (!formData.tenantId) {
      newErrors.tenantId = 'Select a tenant';
      valid = false;
    }
    const type = (formData.type || '').trim();
    if (!type) {
      newErrors.type = 'Violation type is required';
      valid = false;
    }

    if (!valid) {
      setErrors(newErrors);
      return;
    }

    const selectedTenant = tenants.find(t => String(t.id) === String(formData.tenantId));
    if (!selectedTenant) {
      setErrors({ tenantId: 'Selected tenant not found in users database' });
      return;
    }

    try {
      await createRuleViolationApi({
        tenantId: Number(selectedTenant.id),
        tenantName: selectedTenant.name,
        roomNumber: selectedTenant.room || '101',
        type: type,
        severity: formData.severity || 'low',
        description: formData.description || type,
      });

      await refreshData();
      setIsAddModalOpen(false);
      showToast('success', 'Changes saved', `Added ${type} for ${selectedTenant.name}`);
    } catch (err) {
      console.error('Failed to create rule violation:', err);
      showToast('error', 'Error', 'Failed to save rule violation');
    }
  };

  const issueWarning = async (id) => {
    try {
      const v = violations.find((item) => item.id === id);
      await issueRuleViolationWarningApi(id);

      // Notification goes to the TENANT ALONE (NOT owner)
      let crossNotifs = JSON.parse(localStorage.getItem('cross_notifications') || '[]');
      crossNotifs.push({
        id: Date.now(),
        title: 'Warning Issued: Rule Violation',
        message: `You have received a warning for rule violation: ${v?.type || 'Rule Violation'}. Please adhere to PG guidelines.`,
        type: 'warning',
        priority: v?.severity || 'medium',
        targetRole: 'tenant',
        by: 'Warden',
        sentAt: new Date().toLocaleString(),
      });
      localStorage.setItem('cross_notifications', JSON.stringify(crossNotifs));
      window.dispatchEvent(new Event('storage'));

      await refreshData();
      showToast('success', 'Changes saved', 'Warning issued to tenant');
    } catch (err) {
      console.error('Failed to issue warning:', err);
      showToast('error', 'Error', 'Failed to issue warning');
    }
  };

  const escalateViolation = async (id) => {
    try {
      const v = violations.find((item) => item.id === id);
      await escalateRuleViolationApi(id);

      // Notification goes to BOTH OWNER AND TENANT
      let crossNotifs = JSON.parse(localStorage.getItem('cross_notifications') || '[]');
      const now = Date.now();
      crossNotifs.push({
        id: now,
        title: 'Rule Violation Escalated',
        message: `Tenant ${v?.tenantName || v?.tenant || 'Resident'} (Room ${v?.roomNumber || v?.room || 'N/A'}) escalated for ${v?.type || 'rule violation'}.`,
        type: 'warning',
        priority: 'high',
        targetRole: 'owner',
        by: 'Warden',
        sentAt: new Date().toLocaleString(),
      });
      crossNotifs.push({
        id: now + 1,
        title: 'Rule Violation Escalated to Owner',
        message: `Your rule violation regarding "${v?.type || 'Rule Violation'}" has been escalated to the Property Owner.`,
        type: 'warning',
        priority: 'high',
        targetRole: 'tenant',
        by: 'Warden',
        sentAt: new Date().toLocaleString(),
      });
      localStorage.setItem('cross_notifications', JSON.stringify(crossNotifs));
      window.dispatchEvent(new Event('storage'));

      await refreshData();
      showToast('success', 'Changes saved', 'Violation escalated to property owner');
    } catch (err) {
      console.error('Failed to escalate violation:', err);
      showToast('error', 'Error', 'Failed to escalate violation');
    }
  };

  const handleDeleteViolation = async (id) => {
    try {
      await deleteRuleViolationApi(id);
      await refreshData();
      showToast('success', 'Changes saved', 'Violation record deleted');
    } catch (err) {
      console.error('Failed to delete rule violation:', err);
      showToast('error', 'Error', 'Failed to delete record');
    }
  };

  const capitalize = (s) => s && s[0].toUpperCase() + s.slice(1);

  return (
    <section id="violations-section" className="section active">
      <div className="section-header">
        <h2>Rule Violations Monitoring</h2>
        <p>Track and manage tenant rule violations</p>
      </div>

      <div className="violation-stats">
        <div className="stat-card">
          <div className="stat-icon orange"><span className="material-icons-outlined" style={{ fontSize: '32px' }}>warning</span></div>
          <div className="stat-label">Total Violations</div>
          <div className="stat-value">{total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><span className="material-icons-outlined" style={{ fontSize: '32px' }}>warning</span></div>
          <div className="stat-label">High Severity</div>
          <div className="stat-value">{high}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow"><span className="material-icons-outlined" style={{ fontSize: '32px' }}>warning</span></div>
          <div className="stat-label">Medium Severity</div>
          <div className="stat-value">{medium}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><span className="material-icons-outlined" style={{ fontSize: '32px' }}>warning</span></div>
          <div className="stat-label">Low Severity</div>
          <div className="stat-value">{low}</div>
        </div>
      </div>

      <div className="filter-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <label>Filter by Severity:</label>
          <select className="filter-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Severity</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <button className="btn-save" onClick={openAddViolationModal}>+ Add Violation</button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Tenant Name</th>
              <th>Room Number</th>
              <th>Violation Type</th>
              <th>Severity</th>
              <th>Warning Count</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredViolations.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', color: '#6b7280', padding: '24px' }}>No violations found</td></tr>
            ) : (
              filteredViolations.map(v => (
                <tr key={v.id}>
                  <td>
                    <strong>{v.tenant || v.tenantName}</strong>
                    {v.escalatedToOwner && (
                      <span style={{ marginLeft: '8px', fontSize: '11px', background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        Escalated to Owner
                      </span>
                    )}
                  </td>
                  <td><span className="room-badge">{v.room || v.roomNumber}</span></td>
                  <td>{v.type}</td>
                  <td><span className={`badge badge-${v.severity}`}>⚠️ {capitalize(v.severity)}</span></td>
                  <td>
                    <span className="badge-warnings badge" style={{ background: '#fef9c3', color: '#b45309' }}>
                      {v.warnings || v.warningCount || 1} warning{(v.warnings || v.warningCount) > 1 ? 's' : ''}
                    </span>
                  </td>
                  <td>{v.date || v.reportedAt}</td>
                  <td>
                    <div className="action-icons">
                      <button className="btn-issue-warning" onClick={() => issueWarning(v.id)}>Issue Warning</button>
                      <button className="btn-escalate" onClick={() => escalateViolation(v.id)} disabled={v.escalatedToOwner}>
                        {v.escalatedToOwner ? 'Escalated' : '↑ Escalate'}
                      </button>
                      <button 
                        title="Delete record"
                        style={{ background: '#fee2e2', border: 'none', color: '#dc2626', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                        onClick={() => handleDeleteViolation(v.id)}
                      >
                        <span className="material-icons-outlined" style={{ fontSize: '16px' }}>delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="violation-policy">
        <div className="policy-header"><span className="material-icons-outlined" style={{ fontSize: '24px' }}>warning</span> Violation Policy</div>
        <ul>
          <li>1st Warning: Verbal warning and notification</li>
          <li>2nd Warning: Written warning sent to tenant</li>
          <li>3rd Warning: Escalated to property owner for action</li>
          <li>Severe violations may result in immediate escalation</li>
        </ul>
      </div>

      {/* Add Violation Modal */}
      <Modal
        isOpen={isAddModalOpen}
        title="Add Rule Violation"
        onCancel={() => setIsAddModalOpen(false)}
        onConfirm={handleAddViolation}
      >
        <div className="form-group">
          <label>Tenant (Registered User) *</label>
          <select 
            className="filter-select" 
            style={{ width: '100%', boxSizing: 'border-box' }}
            value={formData.tenantId || ''}
            onChange={(e) => handleInputChange('tenantId', e.target.value)}
          >
            <option value="" disabled>Select registered tenant</option>
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.name} (Room {t.room}) [User ID: #{t.id}]</option>
            ))}
            {tenants.length === 0 && <option disabled>No tenants available</option>}
          </select>
          {errors.tenantId && <div className="error-msg show">{errors.tenantId}</div>}
        </div>
        <div className="form-group">
          <label>Violation Type *</label>
          <div className="input-wrapper">
            <input 
              type="text" 
              placeholder="e.g. Late Night Entry, Noise Complaint" 
              value={formData.type || ''}
              onChange={(e) => handleInputChange('type', e.target.value)}
            />
          </div>
          {errors.type && <div className="error-msg show">{errors.type}</div>}
        </div>
        <div className="form-group">
          <label>Severity *</label>
          <select 
            className="filter-select" 
            style={{ width: '100%', boxSizing: 'border-box' }}
            value={formData.severity || 'low'}
            onChange={(e) => handleInputChange('severity', e.target.value)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div className="form-group">
          <label>Description / Notes</label>
          <div className="input-wrapper">
            <input 
              type="text" 
              placeholder="Optional notes or details" 
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
            />
          </div>
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
