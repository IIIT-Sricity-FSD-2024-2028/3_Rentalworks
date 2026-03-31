// ===================================================
//  dashboard_warden.js
//  Handles: Stats, Charts, Recent Activity
// ===================================================

function renderDashboard() {
  // Calculate everything live from actual data arrays
  const totalRooms      = rooms.length;
  const occupiedRooms   = rooms.filter(r => r.occupancy === 'Occupied').length;
  const vacantRooms     = rooms.filter(r => r.occupancy === 'Vacant').length;
  const activeComplaints = complaints.filter(c => c.status === 'open' || c.status === 'in_progress').length;
  const ruleViolations  = violations.length;

  setInner('stat-total-tenants',     tenants.length);
  setInner('stat-occupied-rooms',    occupiedRooms);
  setInner('stat-vacant-rooms',      vacantRooms);
  setInner('stat-active-complaints', activeComplaints);
  setInner('stat-violations',        ruleViolations);

  renderRecentComplaints();
  renderRecentActivity();
  renderBarChart();
  renderPieChart();
}

function renderRecentComplaints() {
  const container = document.getElementById('recent-complaints');
  if (!container) return;

  if (complaints.length === 0) {
    container.innerHTML = '<p style="color:#6b7280;font-size:13px;text-align:center;padding:16px">No recent complaints</p>';
    return;
  }

  const recent = complaints.slice(0, 3);
  container.innerHTML = recent.map(c => `
    <div class="complaint-item">
      <div class="complaint-info">
        <strong>${c.type} issue</strong>
        <span>${c.tenant} - Room ${c.room}</span>
      </div>
      <div class="complaint-meta">
        <span class="badge badge-${c.priority}">${capitalize(c.priority)}</span>
        <div class="complaint-time">${c.date}</div>
      </div>
    </div>
  `).join('');
}

function renderRecentActivity() {
  const container = document.getElementById('recent-activity');
  if (!container) return;
  const items = [
    { text: 'New tenant check-in', sub: 'Sneha Patil - Room 208', time: '1 day ago' },
    { text: 'Room change request', sub: 'Anita Desai - Room 305', time: '3 days ago' }
  ];
  container.innerHTML = items.map(item => `
    <div class="activity-item">
      <div class="activity-dot"></div>
      <div class="activity-info">
        <strong>${item.text}</strong>
        <span>${item.sub}</span>
      </div>
      <div class="activity-time">${item.time}</div>
    </div>
  `).join('');
}

function renderBarChart() {
  const canvas = document.getElementById('bar-chart-canvas');
  if (!canvas) return;
  const data = [
    { label: 'Electrical', val: 12 },
    { label: 'Plumbing', val: 8 },
    { label: 'Others', val: 6 },
    { label: 'Cleanliness', val: 4 }
  ];
  const max = Math.max(...data.map(d => d.val));
  canvas.innerHTML = data.map(d => `
    <div class="bar-group">
      <div class="bar" style="height:${(d.val / max) * 100}px" title="${d.val}"></div>
      <span class="bar-label">${d.label}</span>
    </div>
  `).join('');
}

function renderPieChart() {
  const svg = document.getElementById('pie-chart-svg');
  if (!svg) return;

  const total       = rooms.length;
  const occupied    = rooms.filter(r => r.occupancy === 'Occupied').length;
  const vacant      = rooms.filter(r => r.occupancy === 'Vacant').length;
  const maintenance = rooms.filter(r => r.maintenance === 'Under Maintenance').length;

  const occPct  = Math.round((occupied / total) * 100);
  const vacPct  = Math.round((vacant / total) * 100);
  const mainPct = 100 - occPct - vacPct;

  const data = [
    { label: `Occupied ${occPct}%`,    value: occPct,  color: '#2563eb' },
    { label: `Vacant ${vacPct}%`,      value: vacPct,  color: '#16a34a' },
    { label: `Maintenance ${mainPct}%`, value: mainPct, color: '#f5a623' }
  ];

  // rest of pie chart code stays the same...
  let paths = '';
  let startAngle = 0;
  const cx = 70, cy = 70, r = 60;
  data.forEach(d => {
    const angle    = (d.value / 100) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const x1 = cx + r * Math.sin(startAngle);
    const y1 = cy - r * Math.cos(startAngle);
    const x2 = cx + r * Math.sin(endAngle);
    const y2 = cy - r * Math.cos(endAngle);
    const large = angle > Math.PI ? 1 : 0;
    paths += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z" fill="${d.color}" stroke="white" stroke-width="2"/>`;
    startAngle = endAngle;
  });
  svg.innerHTML = paths;

  const legend = document.getElementById('pie-legend');
  if (legend) {
    legend.innerHTML = data.map(d => `
      <div class="pie-legend-item">
        <div class="pie-dot" style="background:${d.color}"></div>
        <span>${d.label}</span>
      </div>
    `).join('');
  }
}