// ===================================================
//  dashboard_admin.js
//  Handles: Dynamic Stats, Charts, Activity Feed,
//           System Health, Quick Actions
// ===================================================

function renderDashboard() {
  const totalAdmins = users.filter(u => u.role === 'admin').length;
  const verifiedPgs = properties.filter(p => p.status !== 'pending').length;
  const pendingPgs  = properties.filter(p => p.status === 'pending').length;

  const registeredOwners = JSON.parse(localStorage.getItem('registered_owners') || '[]');
  
  // Sum subscriptions by unique owner
  const processedOwners = new Set();
  const subsRev = properties.reduce((acc, p) => {
    let ownerName = p.owner?.name || p.owner;
    let ownerEmail = p.owner?.email || p.ownerEmail;
    
    // Create a unique key for the owner
    const ownerKey = ownerEmail || ownerName || 'unknown';
    
    if (processedOwners.has(ownerKey) && ownerKey !== 'unknown') {
      return acc; // Already added this owner's subscription
    }
    processedOwners.add(ownerKey);

    let ownerObj = registeredOwners.find(o => (ownerName && o.name === ownerName) || (ownerEmail && o.email === ownerEmail));
    if (!ownerObj) ownerObj = users.find(u => (ownerName && u.name === ownerName) || (ownerEmail && u.email === ownerEmail));
    
    if (!ownerObj && p.owner && typeof p.owner === 'object') {
      ownerObj = p.owner;
    }
    
    let rev = 0;
    if (ownerObj && ownerObj.subscriptionPlan) {
      rev = Number(ownerObj.subscriptionFee) || 0;
    } else if (p.status === 'verified' || p.status === 'approved') {
      rev = 5000;
    }
    return acc + rev;
  }, 0);

  const commRev     = payments.filter(p => p.status === 'verified').reduce((s, p) => s + (p.platformFee || Math.round(p.amount * 0.10)), 0);
  const totalRev    = subsRev + commRev;

  setTxt('d-total-admins', totalAdmins);
  setTxt('d-total-pgs',    verifiedPgs);
  setTxt('d-pending-pgs',  pendingPgs);
  setTxt('d-subs-rev',     '₹' + subsRev.toLocaleString('en-IN'));
  setTxt('d-comm-rev',     '₹' + commRev.toLocaleString('en-IN'));
  setTxt('d-total-rev',    '₹' + totalRev.toLocaleString('en-IN'));

  if (typeof renderRevenueChart === 'function') renderRevenueChart(totalRev);
  if (typeof renderBookingChart === 'function') renderBookingChart(verifiedPgs);
}

// ===== ACTIVITY FEED =====
// Format: [Action] + [Person] + [Property] + [Timestamp]
function renderActivityFeed() {
  const c = document.getElementById('activity-feed');
  if (!c) return;

  const feed = [
    { icon: '📅', action: 'Booked Room 305',  person: 'Amit Sharma',  property: 'Green Valley PG',  time: '5 min ago' },
    { icon: '💰', action: 'Paid ₹9,000 rent', person: 'Priya Patel',  property: 'Sunrise Heights',  time: '12 min ago' },
    { icon: '⚠️', action: 'Raised complaint', person: 'Rohan Singh',  property: 'Urban Nest',        time: '23 min ago' },
    { icon: '⭐', action: 'Left 5-star review',person: 'Sneha Gupta', property: 'Sunrise Heights',  time: '1 hour ago' },
    { icon: '🏢', action: 'Added new property',person: 'Rajesh Kumar',property: 'Urban Nest',        time: '2 hours ago' },
    { icon: '❌', action: 'Cancelled booking', person: 'Anita Verma', property: 'Sunrise Heights',  time: '3 hours ago' }
  ];

  c.innerHTML = feed.map(a => `
    <div class="feed-item">
      <div class="feed-ico-wrap">${a.icon}</div>
      <div class="feed-text">
        <strong>${a.person}</strong> ${a.action} at <strong>${a.property}</strong>
      </div>
      <div class="feed-time">${a.time}</div>
    </div>
  `).join('');
}

// ===== REVENUE CHART =====
function renderRevenueChart(currentRev = 50000) {
  const c = document.getElementById('revenue-chart');
  if (!c) return;
  // Generate dynamic data points ending at currentRev
  const data = [
    Math.round(currentRev * 0.4) || 10000,
    Math.round(currentRev * 0.5) || 20000,
    Math.round(currentRev * 0.65) || 30000,
    Math.round(currentRev * 0.75) || 35000,
    Math.round(currentRev * 0.9) || 45000,
    currentRev || 50000
  ];
  const max  = Math.max(...data, 1000);
  const w = 300, h = 120, pad = 10;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v / max) * (h - pad * 2));
    return `${x},${y}`;
  }).join(' ');
  const last = data.length - 1;
  const areaBot = `${pad + (last / last) * (w - pad * 2)},${h - pad} ${pad},${h - pad}`;
  c.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
      <defs>
        <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#22c55e" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="#22c55e" stop-opacity="0.03"/>
        </linearGradient>
      </defs>
      <polygon points="${pts} ${areaBot}" fill="url(#rg)"/>
      <polyline points="${pts}" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${data.map((v, i) => {
        const x = pad + (i / (data.length - 1)) * (w - pad * 2);
        const y = h - pad - ((v / max) * (h - pad * 2));
        return `<circle cx="${x}" cy="${y}" r="3.5" fill="white" stroke="#22c55e" stroke-width="2"><title>₹${v.toLocaleString()}</title></circle>`;
      }).join('')}
    </svg>`;
}

// ===== BOOKING CHART =====
function renderBookingChart(currentPgs = 10) {
  const c = document.getElementById('booking-chart');
  if (!c) return;
  // Generate dynamic data points ending at currentPgs
  const data = [
    Math.round(currentPgs * 0.2) || 2,
    Math.round(currentPgs * 0.4) || 4,
    Math.round(currentPgs * 0.5) || 5,
    Math.round(currentPgs * 0.7) || 7,
    Math.round(currentPgs * 0.9) || 9,
    currentPgs || 10
  ];
  const max  = Math.max(...data, 5);
  c.innerHTML = data.map(v => `
    <div class="chart-bar" style="height:${(v / max) * 100}%;background:#2563eb;margin:0 3px" title="${v} PGs">
      <span class="bar-tip">${v}</span>
    </div>
  `).join('');
}

// ===== SYSTEM HEALTH =====
function renderSystemHealth() {
  const c = document.getElementById('system-health');
  if (!c) return;

  const pendingProps    = properties.filter(p => p.status === 'pending').length;
  const pendingPayments = payments.filter(p => p.status === 'pending').length;
  const overdueBookings = bookings.filter(b => b.status === 'overdue').length;

  c.innerHTML = `
    <div class="health-item">
      <span class="health-dot ${pendingProps > 0 ? 'warn' : 'ok'}"></span>
      <span class="health-label">Pending Property Approvals</span>
      <strong>${pendingProps}</strong>
    </div>
    <div class="health-item">
      <span class="health-dot ${pendingPayments > 0 ? 'warn' : 'ok'}"></span>
      <span class="health-label">Payments Awaiting Verification</span>
      <strong>${pendingPayments}</strong>
    </div>
    <div class="health-item">
      <span class="health-dot ${overdueBookings > 0 ? 'danger' : 'ok'}"></span>
      <span class="health-label">Overdue Bookings</span>
      <strong>${overdueBookings}</strong>
    </div>
    <div class="health-item">
      <span class="health-dot ok"></span>
      <span class="health-label">System Status</span>
      <strong style="color:#16a34a">Operational</strong>
    </div>
    <div class="health-item">
      <span class="health-dot ok"></span>
      <span class="health-label">Last Data Sync</span>
      <strong>${new Date().toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'})}</strong>
    </div>
  `;
}

// ===== QUICK ACTIONS =====
function renderQuickActions() {
  const pendingProps    = properties.filter(p => p.status === 'pending').length;
  const pendingPayments = payments.filter(p => p.status === 'pending').length;
  const pendingBookings = bookings.filter(b => b.status === 'pending').length;

  setTxt('qa-pending-props',    pendingProps);
  setTxt('qa-pending-payments', pendingPayments);
  setTxt('qa-pending-bookings', pendingBookings);
}
