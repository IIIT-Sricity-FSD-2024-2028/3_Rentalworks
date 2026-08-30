// ===================================================
//  complaints_warden.js
//  Handles: Render Complaints, Detail View, Status
//           Update, Remarks, Escalate
// ===================================================

function renderComplaints(statusFilter = 'all', priorityFilter = 'all') {
  const tbody = document.getElementById('complaints-tbody');
  if (!tbody) return;

  let filtered = complaints.filter(c => {
    const matchStatus   = statusFilter   === 'all' || c.status   === statusFilter;
    const matchPriority = priorityFilter === 'all' || c.priority === priorityFilter;
    return matchStatus && matchPriority;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#6b7280;padding:24px">No complaints found</td></tr>`;
  } else {
    tbody.innerHTML = filtered.map(c => `
      <tr>
        <td><strong>${c.id}</strong></td>
        <td>${c.tenant}</td>
        <td><span class="room-badge">${c.room}</span></td>
        <td>${c.type}</td>
        <td style="color:${c.priority === 'high' ? '#dc2626' : c.priority === 'medium' ? '#b45309' : '#16a34a'};font-weight:600">${capitalize(c.priority)}</td>
        <td><span class="badge badge-${c.status.replace('_', '-')}">${getStatusLabel(c.status)}</span></td>
        <td>${c.date}</td>
        <td><button class="btn-view" onclick="viewComplaintDetail('${c.id}')">👁️ View</button></td>
      </tr>
    `).join('');
  }

  const total      = complaints.length;
  const open       = complaints.filter(c => c.status === 'open').length;
  const inProgress = complaints.filter(c => c.status === 'in_progress').length;
  const resolved   = complaints.filter(c => c.status === 'resolved').length;
  setInner('comp-total', total);
  setInner('comp-open', open);
  setInner('comp-inprogress', inProgress);
  setInner('comp-resolved', resolved);
}

function getStatusLabel(status) {
  if (status === 'open')        return '⊙ Open';
  if (status === 'in_progress') return '⏱ In Progress';
  if (status === 'resolved')    return '✓ Resolved';
  return status;
}

// ----- Detail View -----
function viewComplaintDetail(id) {
  currentComplaintId = id;
  const complaint = complaints.find(c => String(c.id) === String(id));
  if (!complaint) return;

  document.getElementById('complaints-list-view').style.display   = 'none';
  document.getElementById('complaint-detail-view').style.display  = 'block';

  setInner('detail-complaint-id', id);
  setInner('detail-type', complaint.type);
  setInner('detail-description', complaint.description);
  setInner('detail-priority', capitalize(complaint.priority));

  document.getElementById('detail-priority').style.color =
    complaint.priority === 'high' ? '#dc2626' :
    complaint.priority === 'medium' ? '#b45309' : '#16a34a';

  document.getElementById('detail-status').innerHTML =
    `<span class="badge badge-${complaint.status.replace('_', '-')}">${getStatusLabel(complaint.status)}</span>`;

  setInner('detail-tenant-name', complaint.tenant);
  setInner('detail-tenant-room', complaint.room);
  setInner('detail-tenant-date', complaint.date);

  // --- Severity Display ---
  const severityEl = document.getElementById('detail-severity-display');
  if (severityEl) {
    const sev = complaint.severity || 'Not Set';
    const sevColors = { High: '#dc2626', Critical: '#7c2d12', Medium: '#b45309', Low: '#16a34a', 'Not Set': '#6b7280' };
    severityEl.innerHTML = `<span style="font-weight:700;color:${sevColors[sev] || '#6b7280'}">${sev}</span>`;
  }

  const timeline = document.getElementById('detail-timeline');
  if (timeline) {
    fetch(`http://localhost:3000/remarks/complaint/${id}`)
      .then(res => res.ok ? res.json() : [])
      .then(remarks => {
        let events = [...(complaint.timeline || [])];
        remarks.forEach(r => {
          events.push({
            time: new Date(r.createdAt).toLocaleString(),
            event: r.text,
            by: r.authorRole || 'Warden'
          });
        });

        // Ensure chronological order
        events.sort((a, b) => new Date(a.time) - new Date(b.time));

        if (events.length === 0) {
          timeline.innerHTML = '<p style="color:#6b7280;font-size:13px">No timeline events yet</p>';
        } else {
          timeline.innerHTML = events.map(t => `
            <div class="timeline-item">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <time>${t.time}</time>
                <strong>${t.event}</strong>
                <span>by ${t.by}</span>
              </div>
            </div>
          `).join('');
        }
      })
      .catch(e => {
        console.error('Failed to load remarks:', e);
        timeline.innerHTML = '<p style="color:#dc2626;font-size:13px">Failed to load timeline.</p>';
      });
  }
}

// ----- Set Severity -----
function openSetSeverityModal() {
  if (!currentComplaintId) return;
  const complaint = complaints.find(c => String(c.id) === String(currentComplaintId));
  if (!complaint) return;

  const current = complaint.severity || 'Not Set';
  const severities = [
    { label: 'Low',      color: '#16a34a', bg: '#f0fdf4', desc: 'Minor inconvenience, can wait' },
    { label: 'Medium',   color: '#b45309', bg: '#fef9c3', desc: 'Needs attention within a week' },
    { label: 'High',     color: '#dc2626', bg: '#fee2e2', desc: 'Urgent — resolve within 24 hrs' },
    { label: 'Critical', color: '#7c2d12', bg: '#fef2f2', desc: 'Emergency — immediate action needed' }
  ];

  showModal('Set Complaint Severity', `
    <p style="font-size:13px;color:#6b7280;margin-bottom:16px">Current severity: <strong>${current}</strong></p>
    <div style="display:grid;gap:10px">
      ${severities.map(s => `
        <button
          onclick="setSeverity('${s.label}')"
          style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:10px;
                 border:2px solid ${s.label === current ? s.color : '#e5e7eb'};
                 background:${s.label === current ? s.bg : 'white'};
                 cursor:pointer;text-align:left;width:100%"
        >
          <span style="width:12px;height:12px;border-radius:50%;background:${s.color};flex-shrink:0"></span>
          <div>
            <div style="font-weight:700;color:${s.color}">${s.label}</div>
            <div style="font-size:12px;color:#6b7280">${s.desc}</div>
          </div>
        </button>
      `).join('')}
    </div>
  `, null);
}

function setSeverity(level) {
  if (!currentComplaintId) return;
  const complaint = complaints.find(c => String(c.id) === String(currentComplaintId));
  if (!complaint) return;

  fetch(`http://localhost:3000/complaints/${currentComplaintId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-role': 'warden' },
    body: JSON.stringify({ severity: level })
  }).then(res => {
    if (res.ok) {
      complaint.severity = level;
      fetch(`http://localhost:3000/remarks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaintId: Number(currentComplaintId), authorId: 1, text: `Severity set to ${level}` })
      }).then(() => viewComplaintDetail(currentComplaintId));
      renderComplaints();
      showToast('success', 'Severity Set', `Complaint severity updated to ${level}`);
    }
  });
}

function backToComplaints() {
  document.getElementById('complaints-list-view').style.display  = 'block';
  document.getElementById('complaint-detail-view').style.display = 'none';
  currentComplaintId = null;
}

function updateComplaintStatus(newStatus) {
  if (!currentComplaintId) return;
  const complaint = complaints.find(c => String(c.id) === String(currentComplaintId));
  if (!complaint) return;

  fetch(`http://localhost:3000/complaints/${currentComplaintId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-role': 'warden' },
    body: JSON.stringify({ status: newStatus })
  }).then(res => {
    if (res.ok) {
      complaint.status = newStatus;
      fetch(`http://localhost:3000/remarks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaintId: Number(currentComplaintId), authorId: 1, text: `Status changed to ${getStatusLabel(newStatus)}` })
      }).then(() => viewComplaintDetail(currentComplaintId));
      renderComplaints();
      showToast('success', 'Status Updated', `Complaint marked as ${newStatus.replace('_', ' ')}`);
    }
  });
}

function addRemark() {
  const remark = document.getElementById('detail-remark').value.trim();
  if (!remark) {
    showToast('error', 'Empty Remark', 'Please enter a remark before submitting');
    return;
  }
  if (!currentComplaintId) return;

  fetch(`http://localhost:3000/remarks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-role': 'warden' },
    body: JSON.stringify({ complaintId: Number(currentComplaintId), authorId: 1, text: remark })
  }).then(res => {
    if (res.ok) {
      document.getElementById('detail-remark').value = '';
      viewComplaintDetail(currentComplaintId);
      showToast('success', 'Remark Added', 'Your remark has been saved');
    }
  });
}

function escalateComplaint() {
  if (!currentComplaintId) return;
  const complaint = complaints.find(c => String(c.id) === String(currentComplaintId));
  if (!complaint) return;

  complaint.timeline = complaint.timeline || [];
  complaint.timeline.push({
    time: new Date().toLocaleString(),
    event: 'Complaint escalated to Property Owner',
    by: 'Warden'
  });

  notifications.unshift({
    id: Date.now(),
    title: 'Complaint Escalated',
    message: `Complaint (${complaint.tenant}) escalated to owner.`,
    time: 'Just now',
    read: false,
    icon: 'warning'
  });

  let crossNotifs = JSON.parse(localStorage.getItem('cross_notifications') || '[]');
  const escalateId = Date.now();

  // Notify Owner
  crossNotifs.push({
    id: escalateId,
    title: 'Complaint Escalated by Warden',
    message: `Complaint from ${complaint.tenant} (Room ${complaint.room}) requires your attention.`,
    type: 'warning',
    priority: 'high',
    targetRole: 'owner',
    by: 'Warden',
    sentAt: new Date().toLocaleString()
  });

  // Also notify the Tenant that their complaint was escalated
  crossNotifs.push({
    id: escalateId + 1,
    title: 'Complaint Escalated by Warden',
    message: `Your complaint "${complaint.description || complaint.type}" has been escalated to the Property Owner for faster resolution.`,
    type: 'warning',
    priority: 'high',
    targetRole: 'tenant',
    by: 'Warden',
    sentAt: new Date().toLocaleString()
  });

  // === KEY FIX: Push the escalated complaint into global_issues ===
  // Owner's issues.js reads global_issues, so this will auto-appear in their Issues page.
  let globalIss = JSON.parse(localStorage.getItem('global_issues') || '[]');
  const escId = 'esc_' + complaint.id;
  const alreadyEscalated = globalIss.some(i => String(i.id) === escId);
  if (!alreadyEscalated) {
    globalIss.unshift({
      id: escId,
      title: complaint.description || complaint.type || 'Escalated Complaint',
      desc: complaint.description || 'Escalated from Warden dashboard.',
      category: complaint.type || 'Maintenance',
      priority: complaint.priority || 'high',
      status: complaint.status === 'in_progress' ? 'in-progress' : complaint.status || 'open',
      tenantName: complaint.tenant || 'Tenant',
      room: complaint.room || 'A-204',
      propertyName: 'Sunrise PG Residency',
      reportedDate: new Date().toISOString().split('T')[0],
      _escalatedByWarden: true
    });
    localStorage.setItem('global_issues', JSON.stringify(globalIss));
  }

  localStorage.setItem('cross_notifications', JSON.stringify(crossNotifs));

  saveToStorage();
  viewComplaintDetail(currentComplaintId);
  updateNotifBadge();
  showToast('warning', 'Escalated to Owner', 'Complaint has been sent to the Property Owner and will appear in their Issues page.');
}

// ----- Filter Setup -----
function setupComplaintFilters() {
  const compStatus   = document.getElementById('complaint-status-filter');
  const compPriority = document.getElementById('complaint-priority-filter');

  if (compStatus) {
    compStatus.addEventListener('change', () => {
      renderComplaints(compStatus.value, compPriority ? compPriority.value : 'all');
    });
  }
  if (compPriority) {
    compPriority.addEventListener('change', () => {
      renderComplaints(compStatus ? compStatus.value : 'all', compPriority.value);
    });
  }
}
