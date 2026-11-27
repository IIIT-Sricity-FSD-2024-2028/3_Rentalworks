import React from 'react';
import useScreenState from '../../../app/useScreenState';
import { useDispatch } from 'react-redux';
import { useWardenData, useWardenRun, useWardenToast } from '../utils/dataStore';
import {
  addComplaintEvent,
  escalateTenant,
  notifyTenant,
  updateComplaintStatus,
} from '../../../features/warden/wardenSlices';
import Modal from '../components/Modal';

export default function Complaints() {
  const { data } = useWardenData();
  const dispatch = useDispatch();
  const run = useWardenRun();
  
  const [statusFilter, setStatusFilter] = useScreenState('all');
  const [priorityFilter, setPriorityFilter] = useScreenState('all');
  // Complaints and issues share this list, so a row is identified by type + id.
  const [selectedKey, setSelectedKey] = useScreenState(null);
  const keyOf = (c) => `${c.entityType}-${c.id}`;
  const [busy, setBusy] = useScreenState(false);
  
  const [remarkText, setRemarkText] = useScreenState('');
  const [isSeverityModalOpen, setIsSeverityModalOpen] = useScreenState(false);
  

  const complaints = data.complaints || [];

  const showToast = useWardenToast();

  const getStatusLabel = (status) => {
    if (status === 'open') return '⊙ Open';
    if (status === 'in_progress') return '⏱ In Progress';
    if (status === 'resolved') return '✓ Resolved';
    return status;
  };

  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

  const getPriorityColor = (priority) => {
    if (priority === 'high') return '#dc2626';
    if (priority === 'medium') return '#b45309';
    return '#16a34a';
  };

  const getSeverityColor = (sev) => {
    const sevColors = { High: '#dc2626', Critical: '#7c2d12', Medium: '#b45309', Low: '#16a34a', 'Not Set': '#6b7280' };
    return sevColors[sev] || '#6b7280';
  };

  // Derived state
  const filteredComplaints = complaints.filter(c => {
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchPriority = priorityFilter === 'all' || c.priority === priorityFilter;
    return matchStatus && matchPriority;
  });

  const total = complaints.length;
  const open = complaints.filter(c => c.status === 'open').length;
  const inProgress = complaints.filter(c => c.status === 'in_progress').length;
  const resolved = complaints.filter(c => c.status === 'resolved').length;

  const selectedComplaint = selectedKey ? complaints.find(c => keyOf(c) === selectedKey) || null : null;
  const kind = selectedComplaint?.entityType === 'issue' ? 'Issue' : 'Complaint';

  // Actions — each one is saved on the server before the UI reports success.
  const addEvent = (event, by = 'Warden') =>
    dispatch(addComplaintEvent({ id: selectedComplaint.id, entityType: selectedComplaint.entityType, event, by }));

  const perform = async (fn) => {
    if (!selectedComplaint || busy) return;
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      showToast('error', 'Action failed', err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateStatus = (newStatus) =>
    perform(async () => {
      const { id, entityType } = selectedComplaint;
      const changes = { status: newStatus };
      if (entityType !== 'issue' && newStatus === 'resolved') changes.resolution = 'Resolved by Warden';
      // The API notifies the tenant about the status change.
      await run(updateComplaintStatus({ id, entityType, changes }));
      addEvent(`Status changed to ${getStatusLabel(newStatus)}`);
      showToast('success', `${kind} marked as ${newStatus.replace('_', ' ')}`);
    });

  const handleAddRemark = () =>
    perform(async () => {
      const text = remarkText.trim();
      if (!text) throw new Error('Please enter a remark before submitting');
      if (!selectedComplaint.tenantId) throw new Error('This record has no tenant to notify');
      await run(
        notifyTenant({
          tenantId: selectedComplaint.tenantId,
          payload: { title: `Warden remark on your ${kind.toLowerCase()}`, message: `${selectedComplaint.title}: ${text}`, kind: 'custom' },
        }),
      );
      addEvent(text, 'Warden (Remark)');
      setRemarkText('');
      showToast('success', 'Remark sent to the tenant');
    });

  const handleEscalate = () =>
    perform(async () => {
      if (!selectedComplaint.tenantId) throw new Error('This record has no tenant to escalate');
      await run(
        escalateTenant({
          tenantId: selectedComplaint.tenantId,
          payload: {
            message: `${kind} from ${selectedComplaint.tenant} (Room ${selectedComplaint.room}): ${selectedComplaint.description || selectedComplaint.title}`,
            category: 'violation',
          },
        }),
      );
      addEvent(`${kind} escalated to Property Owner`);
      showToast('success', 'The property owner has been notified');
    });

  const handleSetSeverity = (level) =>
    perform(async () => {
      const { id, entityType } = selectedComplaint;
      await run(updateComplaintStatus({ id, entityType, changes: { priority: level.toLowerCase() } }));
      addEvent(`Severity set to ${level}`);
      setIsSeverityModalOpen(false);
      showToast('success', `Severity set to ${level}`);
    });

  const renderSeverityOptions = () => {
    const severities = [
      { label: 'Low',      color: '#16a34a', bg: '#f0fdf4', desc: 'Minor inconvenience, can wait' },
      { label: 'Medium',   color: '#b45309', bg: '#fef9c3', desc: 'Needs attention within a week' },
      { label: 'High',     color: '#dc2626', bg: '#fee2e2', desc: 'Urgent — resolve within 24 hrs' }
    ];
    const current = capitalize(selectedComplaint?.priority) || 'Not Set';

    return (
      <div style={{ display: 'grid', gap: '10px' }}>
        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
          Current severity: <strong>{current}</strong>
        </p>
        {severities.map(s => (
          <button
            key={s.label}
            onClick={() => handleSetSeverity(s.label)}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px',
              border: `2px solid ${s.label === current ? s.color : '#e5e7eb'}`,
              background: s.label === current ? s.bg : 'white',
              cursor: 'pointer', textAlign: 'left', width: '100%'
            }}
          >
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: s.color, flexShrink: 0 }}></span>
            <div>
              <div style={{ fontWeight: 700, color: s.color }}>{s.label}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>{s.desc}</div>
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <section id="complaints-section" className="section active">
      
      {!selectedComplaint ? (
        /* LIST VIEW */
        <div id="complaints-list-view">
          <div className="section-header">
            <h2>Complaint Management</h2>
            <p>Review and manage tenant complaints</p>
          </div>

          <div className="complaint-stats">
            <div className="stat-card">
              <div className="complaint-stat-icon" style={{ background: '#dbeafe' }}><span className="material-icons-outlined" style={{ fontSize: '32px' }}>chat</span></div>
              <div className="stat-label">Total Complaints</div>
              <div className="stat-value">{total}</div>
            </div>
            <div className="stat-card">
              <div className="complaint-stat-icon" style={{ background: '#fee2e2' }}><span className="material-icons-outlined" style={{ fontSize: '32px' }}>chat</span></div>
              <div className="stat-label">Open</div>
              <div className="stat-value">{open}</div>
            </div>
            <div className="stat-card">
              <div className="complaint-stat-icon" style={{ background: '#fef9c3' }}><span className="material-icons-outlined" style={{ fontSize: '32px' }}>chat</span></div>
              <div className="stat-label">In Progress</div>
              <div className="stat-value">{inProgress}</div>
            </div>
            <div className="stat-card">
              <div className="complaint-stat-icon" style={{ background: '#dcfce7' }}><span className="material-icons-outlined" style={{ fontSize: '32px' }}>chat</span></div>
              <div className="stat-label">Resolved</div>
              <div className="stat-value">{resolved}</div>
            </div>
          </div>

          <div className="table-wrapper">
            <div className="table-header">
              <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
              <select className="filter-select" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
                <option value="all">All Priority</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Complaint ID</th>
                  <th>Tenant Name</th>
                  <th>Room</th>
                  <th>Complaint Type</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.length === 0 ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', color: '#6b7280', padding: '24px' }}>No complaints found</td></tr>
                ) : (
                  filteredComplaints.map(c => {
                    const tenantName = typeof c.tenant === 'object' && c.tenant !== null ? (c.tenant.name || 'Tenant') : (c.tenant || 'Tenant');
                    const roomNum = typeof c.room === 'object' && c.room !== null ? (c.room.roomNumber || '—') : (c.room || '—');
                    return (
                      <tr key={keyOf(c)}>
                        <td><strong>{c.entityType === 'issue' ? 'ISS' : 'CMP'}-{c.id}</strong></td>
                        <td>{tenantName}</td>
                        <td><span className="room-badge">{roomNum}</span></td>
                        <td>{c.type || c.title || 'Issue'}</td>
                        <td style={{ color: getPriorityColor(c.priority), fontWeight: 600 }}>{capitalize(c.priority)}</td>
                        <td><span className={`badge badge-${(c.status || 'open').replace('_', '-')}`}>{getStatusLabel(c.status)}</span></td>
                        <td>{c.date || 'Recently'}</td>
                        <td>
                          <button className="btn-view" onClick={() => setSelectedKey(keyOf(c))}>👁️ View</button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* DETAIL VIEW */
        <div id="complaint-detail-view">
          <div className="back-btn" onClick={() => setSelectedKey(null)}>← Back to Complaints</div>
          <div className="section-header">
            <h2>Complaint Details</h2>
            <p>Complaint ID: <span>{selectedComplaint.id}</span></p>
          </div>

          <div className="complaint-detail-layout">
            {/* Left */}
            <div>
              <div className="detail-card">
                <h3>Complaint Information</h3>
                <div className="detail-field"><label>Complaint Type</label><p>{selectedComplaint.type}</p></div>
                <div className="detail-field"><label>Description</label><p>{selectedComplaint.description}</p></div>
                <div className="status-row">
                  <div>
                    <label style={{ fontSize: '12px', color: '#6b7280' }}>Priority</label>
                    <p style={{ fontWeight: 700, fontSize: '14px', color: getPriorityColor(selectedComplaint.priority) }}>
                      {capitalize(selectedComplaint.priority)}
                    </p>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#6b7280' }}>Status</label>
                    <div><span className={`badge badge-${selectedComplaint.status.replace('_', '-')}`}>{getStatusLabel(selectedComplaint.status)}</span></div>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#6b7280' }}>Severity</label>
                    <div style={{ fontSize: '14px' }}>
                      <span style={{ fontWeight: 700, color: getSeverityColor(capitalize(selectedComplaint.priority)) }}>
                        {capitalize(selectedComplaint.priority) || 'Not Set'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="detail-card">
                <h3>Timeline of Updates</h3>
                <div className="timeline">
                  {!selectedComplaint.timeline || selectedComplaint.timeline.length === 0 ? (
                    <p style={{ color: '#6b7280', fontSize: '13px' }}>No timeline events yet</p>
                  ) : (
                    selectedComplaint.timeline.map((t, idx) => (
                      <div className="timeline-item" key={idx}>
                        <div className="timeline-dot"></div>
                        <div className="timeline-content">
                          <time>{t.time}</time>
                          <strong>{t.event}</strong>
                          <span>by {t.by}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="detail-card remarks-section">
                <h3>Remarks</h3>
                <textarea 
                  placeholder="Write a remark for the tenant..."
                  value={remarkText}
                  onChange={(e) => setRemarkText(e.target.value)}
                ></textarea>
                <button className="btn-save" style={{ marginTop: '12px' }} onClick={handleAddRemark}>
                  <span className="material-icons-outlined" style={{ fontSize: '24px' }}>send</span> Send Remark to Tenant
                </button>
              </div>
            </div>

            {/* Right */}
            <div>
              <div className="tenant-detail-card">
                <h4>Tenant Details</h4>
                <div className="tenant-detail-row">
                  <span className="td-icon"><span className="material-icons-outlined" style={{ fontSize: '24px' }}>person</span></span>
                  <div className="td-info">
                    <label>Name</label>
                    <strong>{typeof selectedComplaint.tenant === 'object' && selectedComplaint.tenant !== null ? (selectedComplaint.tenant.name || 'Tenant') : (selectedComplaint.tenant || 'Tenant')}</strong>
                  </div>
                </div>
                <div className="tenant-detail-row">
                  <span className="td-icon"><span className="material-icons-outlined" style={{ fontSize: '24px' }}>home</span></span>
                  <div className="td-info">
                    <label>Room Number</label>
                    <strong>{typeof selectedComplaint.room === 'object' && selectedComplaint.room !== null ? (selectedComplaint.room.roomNumber || '—') : (selectedComplaint.room || '—')}</strong>
                  </div>
                </div>
                <div className="tenant-detail-row">
                  <span className="td-icon"><span className="material-icons-outlined" style={{ fontSize: '24px' }}>calendar_today</span></span>
                  <div className="td-info"><label>Submitted Date</label><strong>{selectedComplaint.date}</strong></div>
                </div>
              </div>

              <div className="action-buttons-card">
                <h4>Actions</h4>
                <button className="action-btn-full btn-mark-progress" disabled={busy || selectedComplaint.status === 'in_progress'} onClick={() => handleUpdateStatus('in_progress')}>Mark In Progress</button>
                <button className="action-btn-full btn-resolve" disabled={busy || selectedComplaint.status === 'resolved'} onClick={() => handleUpdateStatus('resolved')}>Resolve Complaint</button>
                <button className="action-btn-full btn-escalate-owner" disabled={busy} onClick={handleEscalate}>Escalate to Owner</button>
                <button 
                  className="action-btn-full" 
                  onClick={() => setIsSeverityModalOpen(true)}
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: 'white', marginTop: '6px' }}
                >
                  ⚠️ Set Severity
                </button>
              </div>

              <div className="quick-tip-card">
                <div className="qt-title">Quick Tip</div>
                <p>High priority complaints should be addressed within 24 hours. Consider assigning to a vendor for faster resolution.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Set Severity Modal */}
      <Modal
        isOpen={isSeverityModalOpen}
        title="Set Complaint Severity"
        onCancel={() => setIsSeverityModalOpen(false)}
        showFooter={false}
      >
        {renderSeverityOptions()}
      </Modal>

    </section>
  );
}
