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
  const complaint = complaints.find(c => c.id === id);
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

  const timeline = document.getElementById('detail-timeline');
  if (timeline) {
    if (!complaint.timeline || complaint.timeline.length === 0) {
      timeline.innerHTML = '<p style="color:#6b7280;font-size:13px">No timeline events yet</p>';
    } else {
      timeline.innerHTML = complaint.timeline.map(t => `
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
  }
}

function backToComplaints() {
  document.getElementById('complaints-list-view').style.display  = 'block';
  document.getElementById('complaint-detail-view').style.display = 'none';
  currentComplaintId = null;
}

function updateComplaintStatus(newStatus) {
  if (!currentComplaintId) return;
  const complaint = complaints.find(c => c.id === currentComplaintId);
  if (!complaint) return;

  complaint.status = newStatus;
  complaint.timeline = complaint.timeline || [];
  complaint.timeline.push({
    time: new Date().toLocaleString(),
    event: `Status changed to ${getStatusLabel(newStatus)}`,
    by: 'Warden'
  });

  saveToStorage();
  viewComplaintDetail(currentComplaintId);
  renderComplaints();
  showToast('success', 'Status Updated', `Complaint ${currentComplaintId} marked as ${newStatus.replace('_', ' ')}`);
}

function addRemark() {
  const remark = document.getElementById('detail-remark').value.trim();
  if (!remark) {
    showToast('error', 'Empty Remark', 'Please enter a remark before submitting');
    return;
  }
  if (!currentComplaintId) return;

  const complaint = complaints.find(c => c.id === currentComplaintId);
  if (!complaint) return;

  complaint.timeline = complaint.timeline || [];
  complaint.timeline.push({
    time: new Date().toLocaleString(),
    event: remark,
    by: 'Warden (Remark)'
  });

  saveToStorage();
  document.getElementById('detail-remark').value = '';
  viewComplaintDetail(currentComplaintId);
  showToast('success', 'Remark Added', 'Your remark has been saved');
}

function escalateComplaint() {
  if (!currentComplaintId) return;
  const complaint = complaints.find(c => c.id === currentComplaintId);
  if (!complaint) return;

  complaint.timeline = complaint.timeline || [];
  complaint.timeline.push({
    time: new Date().toLocaleString(),
    event: 'Complaint escalated to Property Owner',
    by: 'Warden'
  });

  const newNotif = {
    id: Date.now(),
    title: 'Complaint Escalated',
    message: `Complaint ${currentComplaintId} (${complaint.tenant}) escalated to owner.`,
    time: 'Just now',
    read: false,
    icon: 'warning'
  };
  notifications.unshift(newNotif);

  // Push to cross-actor simulation system for Owner
  let crossNotifs = JSON.parse(localStorage.getItem('cross_notifications') || '[]');
  crossNotifs.push({
    id: Date.now(),
    title: 'Complaint Escalated by Warden',
    message: `Complaint ${currentComplaintId} from ${complaint.tenant} requires your attention.`,
    type: 'warning',
    priority: 'high',
    targetRole: 'owner',
    by: 'Warden',
    sentAt: new Date().toLocaleString()
  });
  localStorage.setItem('cross_notifications', JSON.stringify(crossNotifs));

  saveToStorage();
  viewComplaintDetail(currentComplaintId);
  updateNotifBadge();
  showToast('warning', 'Escalated to Owner', 'Complaint has been sent to the Property Owner');
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
