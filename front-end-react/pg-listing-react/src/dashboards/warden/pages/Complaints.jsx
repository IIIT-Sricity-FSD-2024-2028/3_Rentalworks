import React, { useState } from 'react';
import { useWardenData } from '../utils/dataStore';
import { updateComplaintApi, updateIssueApi, sendTenantNotificationApi } from '../utils/api';
import Modal from '../components/Modal';

export default function Complaints() {
  const { data, updateData } = useWardenData();

  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);

  const [remarkText, setRemarkText] = useState('');
  const [isSeverityModalOpen, setIsSeverityModalOpen] = useState(false);

  const [toast, setToast] = useState(null);

  const complaints = data.complaints || [];
  const notifications = data.notifications || [];

  const showToast = (type, title, message) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 3500);
  };

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

  const selectedComplaint = selectedComplaintId
    ? complaints.find(c => String(c.id) === String(selectedComplaintId))
    : null;

  // Actions
  const updateComplaint = (id, updates) => {
    const updated = complaints.map(c => String(c.id) === String(id) ? { ...c, ...updates } : c);
    updateData('complaints', updated);
  };

  const addTimelineEvent = (id, event, by) => {
    const complaint = complaints.find(c => String(c.id) === String(id));
    if (!complaint) return;
    const newTimeline = [...(complaint.timeline || []), {
      time: new Date().toLocaleString(),
      event,
      by
    }];
    updateComplaint(id, { timeline: newTimeline });
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedComplaint) return;

    addTimelineEvent(selectedComplaint.id, `Status changed to ${getStatusLabel(newStatus)}`, 'Warden');
    updateComplaint(selectedComplaint.id, { status: newStatus });

    try {
      if (selectedComplaint.entityType === 'issue') {
        await updateIssueApi(selectedComplaint.id, {
          status: newStatus,
        });
      } else {
        await updateComplaintApi(selectedComplaint.id, {
          status: newStatus,
          resolution: newStatus === 'resolved' ? 'Resolved by Warden' : undefined,
        });
      }

      // Send persistent notification to tenant 
      await sendTenantNotificationApi({
        userId: selectedComplaint.tenantId || 1,
        title: `${selectedComplaint.entityType === 'issue' ? 'Issue' : 'Complaint'} Status Updated`,
        message: `Your ${selectedComplaint.entityType === 'issue' ? 'issue' : 'complaint'} "${selectedComplaint.title || selectedComplaint.description}" is now ${getStatusLabel(newStatus)}.`,
        type: newStatus === 'resolved' ? 'success' : 'update',
        priority: selectedComplaint.priority || 'medium',
        sentAt: new Date().toISOString(),
      });
    } catch (apiErr) {
      console.warn('Backend status update failed, falling back:', apiErr);
    }

    showToast('success', 'Status Updated', `${selectedComplaint.entityType === 'issue' ? 'Issue' : 'Complaint'} marked as ${newStatus.replace('_', ' ')}`);

    // Notify Tenant ALONE (NOT Owner)
    let crossNotifs = JSON.parse(localStorage.getItem('cross_notifications') || '[]');
    crossNotifs.push({
      id: Date.now(),
      title: `${selectedComplaint.entityType === 'issue' ? 'Issue' : 'Complaint'} Status Updated`,
      message: `Your ${selectedComplaint.entityType === 'issue' ? 'issue' : 'complaint'} "${selectedComplaint.description || selectedComplaint.type}" is now ${getStatusLabel(newStatus)}.`,
      type: newStatus === 'resolved' ? 'success' : 'update',
      priority: selectedComplaint.priority || 'medium',
      targetRole: 'tenant',
      by: 'Warden',
      sentAt: new Date().toLocaleString()
    });

    localStorage.setItem('cross_notifications', JSON.stringify(crossNotifs));

    // Trigger storage event manually to notify Header
    const event = new Event('storage');
    event.key = 'warden_notifications';
    window.dispatchEvent(event);
  };

  const handleAddRemark = async () => {
    if (!remarkText.trim()) {
      showToast('error', 'Empty Remark', 'Please enter a remark before submitting');
      return;
    }
    if (!selectedComplaint) return;

    const remark = remarkText.trim();
    addTimelineEvent(selectedComplaint.id, remark, 'Warden (Remark)');

    // Notify Tenant ALONE (NOT Owner)
    try {
      await sendTenantNotificationApi({
        userId: selectedComplaint.tenantId || 1,
        title: 'New Remark on Complaint',
        message: `Warden added a remark to your complaint "${selectedComplaint.title || selectedComplaint.description}": "${remark}"`,
        type: 'info',
        priority: selectedComplaint.priority || 'medium',
        sentAt: new Date().toISOString(),
      });
    } catch (apiErr) {
      console.warn('Backend remark notification failed:', apiErr);
    }

    let crossNotifs = JSON.parse(localStorage.getItem('cross_notifications') || '[]');
    crossNotifs.push({
      id: Date.now(),
      title: 'New Remark on Complaint',
      message: `Warden added a remark to your complaint "${selectedComplaint.description || selectedComplaint.type}": "${remark}"`,
      type: 'info',
      priority: selectedComplaint.priority || 'medium',
      targetRole: 'tenant',
      by: 'Warden',
      sentAt: new Date().toLocaleString()
    });
    localStorage.setItem('cross_notifications', JSON.stringify(crossNotifs));

    const event = new Event('storage');
    event.key = 'warden_notifications';
    window.dispatchEvent(event);

    setRemarkText('');
    showToast('success', 'Remark Added', 'Your remark has been saved');
  };

  const handleEscalate = async () => {
    if (!selectedComplaint) return;

    addTimelineEvent(selectedComplaint.id, 'Complaint escalated to Property Owner', 'Warden');

    const newNotif = {
      id: Date.now(),
      title: 'Complaint Escalated',
      message: `Complaint (${selectedComplaint.tenant}) escalated to owner.`,
      time: 'Just now',
      read: false,
      icon: 'warning'
    };
    updateData('notifications', [newNotif, ...notifications]);

    // Send notifications to BOTH Owner AND Tenant
    const ownerId = selectedComplaint.ownerId || 4;
    const tenantId = selectedComplaint.tenantId || 1;

    try {
      // 1. Notify Owner via DB
      await sendTenantNotificationApi({
        userId: ownerId,
        title: 'Complaint Escalated by Warden',
        message: `Complaint from ${selectedComplaint.tenant} (Room ${selectedComplaint.room}) requires your attention.`,
        type: 'warning',
        priority: 'high',
        sentAt: new Date().toISOString(),
      });

      // 2. Notify Tenant via DB
      await sendTenantNotificationApi({
        userId: tenantId,
        title: 'Complaint Escalated by Warden',
        message: `Your complaint "${selectedComplaint.title || selectedComplaint.description || selectedComplaint.type}" has been escalated to the Property Owner for faster resolution.`,
        type: 'warning',
        priority: 'high',
        sentAt: new Date().toISOString(),
      });
    } catch (apiErr) {
      console.warn('Backend escalation notifications failed:', apiErr);
    }

    let crossNotifs = JSON.parse(localStorage.getItem('cross_notifications') || '[]');
    const escalateId = Date.now();

    crossNotifs.push({
      id: escalateId,
      title: 'Complaint Escalated by Warden',
      message: `Complaint from ${selectedComplaint.tenant} (Room ${selectedComplaint.room}) requires your attention.`,
      type: 'warning',
      priority: 'high',
      targetRole: 'owner',
      by: 'Warden',
      sentAt: new Date().toLocaleString()
    });

    crossNotifs.push({
      id: escalateId + 1,
      title: 'Complaint Escalated by Warden',
      message: `Your complaint "${selectedComplaint.description || selectedComplaint.type}" has been escalated to the Property Owner for faster resolution.`,
      type: 'warning',
      priority: 'high',
      targetRole: 'tenant',
      by: 'Warden',
      sentAt: new Date().toLocaleString()
    });

    // Escalate to global_issues for the owner dashboard,
    // checks whether the complaint has already been escalated.
    let globalIss = JSON.parse(localStorage.getItem('global_issues') || '[]');
    const escId = 'esc_' + selectedComplaint.id;
    const alreadyEscalated = globalIss.some(i => String(i.id) === escId);

    if (!alreadyEscalated) {
      globalIss.unshift({
        id: escId,
        title: selectedComplaint.description || selectedComplaint.type || 'Escalated Complaint',
        desc: selectedComplaint.description || 'Escalated from Warden dashboard.',
        category: selectedComplaint.type || 'Maintenance',
        priority: selectedComplaint.priority || 'high',
        status: selectedComplaint.status === 'in_progress' ? 'in-progress' : selectedComplaint.status || 'open',
        tenantName: selectedComplaint.tenant || 'Tenant',
        room: selectedComplaint.room || 'A-204',
        propertyName: selectedComplaint.propertyName || 'unknown',
        reportedDate: new Date().toISOString().split('T')[0],
        _escalatedByWarden: true
      });

      localStorage.setItem('global_issues', JSON.stringify(globalIss));
    }

    localStorage.setItem('cross_notifications', JSON.stringify(crossNotifs));
    const event = new Event('storage');
    event.key = 'warden_notifications';
    window.dispatchEvent(event);

    showToast('warning', 'Escalated to Owner', 'Complaint has been sent to the Property Owner and will appear in their Issues page.');
  };

  const handleSetSeverity = (level) => {
    if (!selectedComplaint) return;

    addTimelineEvent(selectedComplaint.id, `Severity set to ${level}`, 'Warden');
    updateComplaint(selectedComplaint.id, { severity: level });

    setIsSeverityModalOpen(false);
    showToast('success', 'Severity Set', `Complaint severity updated to ${level}`);
  };

  const renderSeverityOptions = () => {
    const severities = [
      { label: 'Low', color: '#16a34a', bg: '#f0fdf4', desc: 'Minor inconvenience, can wait' },
      { label: 'Medium', color: '#b45309', bg: '#fef9c3', desc: 'Needs attention within a week' },
      { label: 'High', color: '#dc2626', bg: '#fee2e2', desc: 'Urgent — resolve within 24 hrs' },
      { label: 'Critical', color: '#7c2d12', bg: '#fef2f2', desc: 'Emergency — immediate action needed' }
    ];
    const current = selectedComplaint?.severity || 'Not Set';

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

      {!selectedComplaintId ? (
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
                    const roomNum = typeof c.room === 'object' && c.room !== null ? (c.room.roomNumber || '101') : (c.room || '101');
                    return (
                      <tr key={c.id}>
                        <td><strong>{c.id}</strong></td>
                        <td>{tenantName}</td>
                        <td><span className="room-badge">{roomNum}</span></td>
                        <td>{c.type || c.title || 'Issue'}</td>
                        <td style={{ color: getPriorityColor(c.priority), fontWeight: 600 }}>{capitalize(c.priority)}</td>
                        <td><span className={`badge badge-${(c.status || 'open').replace('_', '-')}`}>{getStatusLabel(c.status)}</span></td>
                        <td>{c.date || 'Recently'}</td>
                        <td>
                          <button className="btn-view" onClick={() => setSelectedComplaintId(c.id)}>👁️ View</button>
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
          <div className="back-btn" onClick={() => setSelectedComplaintId(null)}>← Back to Complaints</div>
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
                      <span style={{ fontWeight: 700, color: getSeverityColor(selectedComplaint.severity || 'Not Set') }}>
                        {selectedComplaint.severity || 'Not Set'}
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
                <h3>Add Remarks</h3>
                <textarea
                  placeholder="Add your remarks or observations..."
                  value={remarkText}
                  onChange={(e) => setRemarkText(e.target.value)}
                ></textarea>
                <button className="btn-save" style={{ marginTop: '12px' }} onClick={handleAddRemark}>
                  <span className="material-icons-outlined" style={{ fontSize: '24px' }}>save</span> Add Remark
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
                    <strong>{typeof selectedComplaint.room === 'object' && selectedComplaint.room !== null ? (selectedComplaint.room.roomNumber || '101') : (selectedComplaint.room || '101')}</strong>
                  </div>
                </div>
                <div className="tenant-detail-row">
                  <span className="td-icon"><span className="material-icons-outlined" style={{ fontSize: '24px' }}>calendar_today</span></span>
                  <div className="td-info"><label>Submitted Date</label><strong>{selectedComplaint.date}</strong></div>
                </div>
              </div>

              <div className="action-buttons-card">
                <h4>Actions</h4>
                <button className="action-btn-full btn-mark-progress" onClick={() => handleUpdateStatus('in_progress')}>Mark In Progress</button>
                <button className="action-btn-full btn-resolve" onClick={() => handleUpdateStatus('resolved')}>Resolve Complaint</button>
                <button className="action-btn-full btn-escalate-owner" onClick={handleEscalate}>Escalate to Owner</button>
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
