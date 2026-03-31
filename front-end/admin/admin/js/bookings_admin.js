// ===================================================
//  bookings_admin.js
//  Handles: Bookings table, lifecycle actions,
//           overdue logic, approve/reject/terminate
// ===================================================

function syncSunriseBookings() {
  try {
    const sunriseStateStr = localStorage.getItem('sunrise_pg_state');
    if (!sunriseStateStr) return;
    const sunriseState = JSON.parse(sunriseStateStr);
    const guestBookings = sunriseState.bookings || [];

    guestBookings.forEach(gbk => {
      // Find if we already mapped this booking into admin bookings array
      const existingIdx = bookings.findIndex(b => b.id.toString() === gbk.id.toString() || b.id === gbk.id);
      
      const tenantName = gbk.user?.name || "Guest Viewer";
      const tenantEmail = gbk.user?.email || "N/A";
      const tenantPhone = gbk.user?.phone || tenantEmail;

      const adminBkPayload = {
        id: gbk.id, // String or Num
        tenant: tenantName,
        phone: tenantPhone, 
        property: gbk.pg || 'Sunrise PG',
        room: gbk.room || 'Single',
        checkIn: gbk.date || '-',
        duration: gbk.duration || '11 Months',
        rent: gbk.rent || 0,
        status: gbk.status === 'confirmed' ? 'active' : (gbk.status === 'approved' ? 'active' : gbk.status), // Admins map approved->active
        _isSunrise: true // Custom flag to identify cross-platform record
      };

      if (existingIdx > -1) {
        // Only update status if it changed from guest side (e.g., cancelled by user)
        if (gbk.status === 'confirmed' && bookings[existingIdx].status === 'active') {
          // Already active, do nothing
        } else if (gbk.status !== 'approved' && gbk.status !== 'confirmed') {
           bookings[existingIdx].status = adminBkPayload.status;
        }
      } else {
        bookings.unshift(adminBkPayload);
      }
    });
    saveData();
  } catch (e) {
    console.error("Failed to sync Sunrise PG bookings", e);
  }
}

function renderBookings(search = '', statusF = 'all') {
  syncSunriseBookings();
  

  // Dynamic KPIs — no Completed in active view
  const stats = {
    total:    bookings.length,
    active:   bookings.filter(b => b.status === 'active').length,
    pending:  bookings.filter(b => b.status === 'pending').length,
    overdue:  bookings.filter(b => b.status === 'overdue').length,
    cancelled:bookings.filter(b => b.status === 'cancelled').length
  };

  setTxt('bk-total',     stats.total);
  setTxt('bk-active',    stats.active);
  setTxt('bk-pending',   stats.pending);
  setTxt('bk-overdue',   stats.overdue);
  setTxt('bk-cancelled', stats.cancelled);

  let filtered = bookings.filter(b => {
    const ms  = !search || b.tenant.toLowerCase().includes(search.toLowerCase()) ||
                b.property.toLowerCase().includes(search.toLowerCase()) ||
                b.room.includes(search);
    const mst = statusF === 'all' || b.status === statusF;
    return ms && mst;
  });

  const tbody = document.getElementById('bookings-tbody');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:24px">No bookings found</td></tr>`;
  } else {
    tbody.innerHTML = filtered.map(b => `
      <tr>
        <td>
          <strong>${b.tenant}</strong>
          <div style="font-size:11px;color:#94a3b8">${b.phone}</div>
        </td>
        <td style="font-size:12px">${b.property}</td>
        <td><span class="room-chip">${b.room}</span></td>
        <td style="font-size:12px">📅 ${b.checkIn}</td>
        <td style="font-size:12px">⏱ ${b.duration}</td>
        <td style="font-size:12px">₹${b.rent.toLocaleString()}</td>
        <td><span class="badge badge-${b.status}">${getBookingStatusLabel(b.status)}</span></td>
        <td>${getBookingActions(b)}</td>
      </tr>
    `).join('');
  }

  setTxt('bookings-count', `Showing ${filtered.length} of ${bookings.length} bookings`);
  setupBookingFilters();
}

function getBookingStatusLabel(status) {
  const labels = {
    active:    'Active',
    pending:   'Pending',
    overdue:   '⚠ Overdue',
    cancelled: 'Cancelled',
    completed: 'Completed'
  };
  return labels[status] || cap(status);
}

function getBookingActions(b) {
  if (b.status === 'pending') return `
    <div class="act-icons">
      <button class="ico-btn" onclick="approveBooking('${b.id}')" title="Approve">✅</button>
      <button class="ico-btn danger" onclick="rejectBooking('${b.id}')" title="Reject">❌</button>
    </div>`;

  if (b.status === 'active') return `
    <div class="act-icons">
      <button class="ico-btn" onclick="viewBooking('${b.id}')" title="View Details">👁️</button>
      <button class="ico-btn danger" onclick="forceTerminate('${b.id}')" title="Force Terminate">🔴</button>
    </div>`;

  if (b.status === 'overdue') return `
    <div class="act-icons">
      <button class="ico-btn warn" onclick="alertTenant('${b.id}')" title="Alert Tenant">📢</button>
      <button class="ico-btn" onclick="notifyOwner('${b.id}')" title="Notify Owner">🏢</button>
    </div>`;

  if (b.status === 'cancelled') return `
    <div class="act-icons">
      <button class="ico-btn" onclick="viewBooking('${b.id}')" title="View Details">👁️</button>
    </div>`;

  return `<div class="act-icons"><button class="ico-btn" onclick="viewBooking('${b.id}')" title="View">👁️</button></div>`;
}

// ===== VIEW BOOKING =====
function viewBooking(id) {
  const b = bookings.find(x => x.id.toString() === id.toString());
  if (!b) return;
  showInfoModal('📅 Booking Details', `Room ${b.room} at ${b.property}`,
    `<div style="display:grid;gap:10px;font-size:13px">
      <div><strong>Tenant:</strong> ${b.tenant}</div>
      <div><strong>Phone:</strong> ${b.phone}</div>
      <div><strong>Property:</strong> ${b.property}</div>
      <div><strong>Room:</strong> ${b.room}</div>
      <div><strong>Check-in:</strong> ${b.checkIn}</div>
      <div><strong>Duration:</strong> ${b.duration}</div>
      <div><strong>Monthly Rent:</strong> ₹${b.rent.toLocaleString()}</div>
      <div><strong>Status:</strong> <span class="badge badge-${b.status}">${getBookingStatusLabel(b.status)}</span></div>
    </div>`
  );
}

// ===== APPROVE BOOKING =====
function approveBooking(id) {
  const b = bookings.find(x => x.id.toString() === id.toString());
  if (!b) return;
  b.status = 'active'; // In admin, approved counts as active
  saveData();

  // Cross-platform sync to Sunrise PG Guest Dashboard
  if (b._isSunrise) {
    try {
      const sunriseStr = localStorage.getItem('sunrise_pg_state');
      if (sunriseStr) {
        const sState = JSON.parse(sunriseStr);
        const sBk = sState.bookings.find(bk => bk.id.toString() === id.toString());
        if (sBk) {
          sBk.status = 'approved'; // Sunrise specific status waiting for payment
          localStorage.setItem('sunrise_pg_state', JSON.stringify(sState));
        }
      }
    } catch(e){}
  }

  renderBookings();
  showToast('success', 'Booking Approved', `${b.tenant} booking conditionally unlocked`);
}

// ===== REJECT BOOKING =====
function rejectBooking(id) {
  const b = bookings.find(x => x.id.toString() === id.toString());
  if (!b) return;
  pendingAction = () => {
    b.status = 'cancelled';
    saveData(); 
    
    if (b._isSunrise) {
      try {
        const sunriseStr = localStorage.getItem('sunrise_pg_state');
        if (sunriseStr) {
          const sState = JSON.parse(sunriseStr);
          const sBk = sState.bookings.find(bk => bk.id.toString() === id.toString());
          if (sBk) {
            sBk.status = 'cancelled';
            localStorage.setItem('sunrise_pg_state', JSON.stringify(sState));
          }
        }
      } catch(e){}
    }
    
    renderBookings(); closeModal();
    showToast('error', 'Booking Rejected', `${b.tenant} booking has been cancelled`);
  };
  openConfirmModal('Reject Booking',
    `Are you sure you want to reject the booking for <strong>${b.tenant}</strong> at ${b.property}?`,
    'btn-confirm-red', 'Reject'
  );
}

// ===== FORCE TERMINATE =====
function forceTerminate(id) {
  const b = bookings.find(x => x.id === id);
  if (!b) return;
  pendingAction = () => {
    b.status = 'cancelled';
    // Flag tenant as inactive
    const tenant = users.find(u => u.name === b.tenant);
    if (tenant) tenant.status = 'suspended';
    saveData(); renderBookings(); closeModal();
    showToast('warning', 'Booking Terminated', `${b.tenant} booking forcefully terminated. Tenant account flagged.`);
  };
  openConfirmModal('Force Terminate Booking',
    `This will immediately terminate <strong>${b.tenant}</strong>'s booking at ${b.property} and flag their account. This cannot be undone.`,
    'btn-confirm-red', 'Force Terminate'
  );
}

// ===== ALERT TENANT =====
function alertTenant(id) {
  const b = bookings.find(x => x.id === id);
  if (!b) return;
  showToast('warning', 'Tenant Alerted', `Overdue alert sent to ${b.tenant}`);
}

// ===== NOTIFY OWNER =====
function notifyOwner(id) {
  const b = bookings.find(x => x.id === id);
  if (!b) return;
  showToast('info', 'Owner Notified', `Owner of ${b.property} notified about overdue booking`);
}

// ===== FILTERS =====
function setupBookingFilters() {
  const s  = document.getElementById('booking-search');
  const sf = document.getElementById('booking-status-filter');
  if (s)  s.oninput  = () => renderBookings(s.value, sf?.value || 'all');
  if (sf) sf.onchange = () => renderBookings(s?.value || '', sf.value);
}
