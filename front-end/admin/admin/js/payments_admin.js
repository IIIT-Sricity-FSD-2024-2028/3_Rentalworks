// ===================================================
//  payments_admin.js
//  Handles: Payments ledger (verified only), GTV,
//           Platform Revenue, Top Earning Properties,
//           Refund clearance logic
// ===================================================

function syncSunrisePayments() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sunrise_pg_state_')) {
        const sunriseStateStr = localStorage.getItem(key);
        if (!sunriseStateStr) continue;
        const sunriseState = JSON.parse(sunriseStateStr);
        const guestBookings = sunriseState.bookings || [];

        guestBookings.forEach(gbk => {
          if (gbk.status === 'confirmed' || gbk.status === 'approved') {
             const txnId = `TXN-${gbk.id}`;
             const existingIdx = payments.findIndex(p => p.id.toString() === gbk.id.toString() || p.transactionId === txnId);
             if (existingIdx === -1) {
                const tenantName = gbk.user?.name || gbk.user || "Guest Viewer";
                const adminPayPayload = {
                  id: gbk.id,
                  tenant: tenantName,
                  property: gbk.pg || 'Sunrise PG Residency',
                  room: gbk.room || 'Single',
                  amount: gbk.rent || 10000,
                  method: 'UPI',
                  transactionId: txnId,
                  paidDate: gbk.date || new Date().toLocaleDateString('en-CA'),
                  status: 'verified',
                  clearance: 'Approved'
                };
                payments.unshift(adminPayPayload);
             }
          }
        });
      }
    }
    saveData();
  } catch (e) {
    console.error("Failed to sync Sunrise PG payments", e);
  }
}

function renderPayments(search = '', statusF = 'verified') {
  syncSunrisePayments();

  // Only verified payments in ledger
  const verifiedPayments = payments.filter(p => p.status === 'verified');
  const pendingPayments  = payments.filter(p => p.status === 'pending');

  const gtv         = verifiedPayments.reduce((s, p) => s + p.amount, 0);
  const platformRev = Math.round(gtv * 0.10);
  const pendingAmt  = pendingPayments.reduce((s, p) => s + p.amount, 0);

  setTxt('pay-gtv',         '₹' + gtv.toLocaleString('en-IN'));
  setTxt('pay-platform-rev','₹' + platformRev.toLocaleString('en-IN'));
  setTxt('pay-pending-amt', '₹' + pendingAmt.toLocaleString('en-IN'));
  setTxt('pay-transactions', verifiedPayments.length);

  // Ledger — show all payments (pending + verified), filter by search
  let filtered = payments.filter(p => {
    return !search ||
      (p.tenant && p.tenant.toLowerCase().includes(search.toLowerCase())) ||
      (p.property && p.property.toLowerCase().includes(search.toLowerCase())) ||
      (p.transactionId && p.transactionId.toLowerCase().includes(search.toLowerCase()));
  });

  const tbody = document.getElementById('payments-tbody');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:#94a3b8;padding:24px">No transactions found</td></tr>`;
  } else {
    tbody.innerHTML = filtered.map(p => {
      const clearance       = p.clearance || 'Pending';
      const refundDisabled  = clearance !== 'Approved';
      const refundStyle     = refundDisabled
        ? 'opacity:0.4;cursor:not-allowed;pointer-events:none'
        : '';
      return `
        <tr>
          <td><strong>${p.tenant || 'Guest'}</strong></td>
          <td style="font-size:12px">${p.property || '-'}</td>
          <td><span class="room-chip">${p.room || '-'}</span></td>
          <td style="font-weight:600">₹${(p.amount || 0).toLocaleString()}</td>
          <td style="font-size:12px">${p.method || '-'}</td>
          <td style="font-size:11px;color:#475569">${p.transactionId || '-'}</td>
          <td style="font-size:12px">${p.paidDate || '-'}</td>
          <td><span class="badge badge-${p.status || 'pending'}">${cap(p.status || 'pending')}</span></td>
          <td>
            <span style="font-size:11px;padding:2px 8px;border-radius:20px;font-weight:600;background:${clearance === 'Approved' ? '#dcfce7' : '#fef9c3'};color:${clearance === 'Approved' ? '#15803d' : '#b45309'}">
              ${clearance}
            </span>
          </td>
          <td>
            <div class="act-icons" style="display:flex;gap:4px;align-items:center;">
              ${p.status === 'pending' ? `
                <button class="btn-verify-cred" style="background:#2563eb;color:#ffffff;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:700;border:none;cursor:pointer;" onclick="verifyPaymentAndGenerateCreds(${p.id})" title="Verify Payment & Generate Credentials">🔑 Verify & Gen Creds</button>
                <button class="btn-reject-pay" style="background:#dc2626;color:#ffffff;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:700;border:none;cursor:pointer;" onclick="rejectPayment(${p.id})" title="Reject Payment">❌ Reject</button>
              ` : ''}
              <button class="btn-issue-refund" style="${refundStyle}" onclick="issueRefund(${p.id})" title="${refundDisabled ? 'Clearance required' : 'Issue Refund'}">
                ${refundDisabled ? '🔒 Refund' : '↩️ Refund'}
              </button>
              <button class="ico-btn" onclick="viewPayment(${p.id})" title="View">👁️</button>
              ${clearance !== 'Approved' ? `<button class="ico-btn" onclick="approveClearance(${p.id})" title="Approve Clearance">✅</button>` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  renderTopEarningProperties();
  renderPayRevChart();
  setupPaymentFilters();
}

// ===== PAYMENT REJECTION =====
function rejectPayment(id) {
  const p = payments.find(x => x.id === id);
  if (!p) return;
  p.status = 'rejected';
  p.clearance = 'Rejected';

  localStorage.setItem('global_payments', JSON.stringify(payments));

  let notifs = JSON.parse(localStorage.getItem('cross_notifications') || '[]');
  notifs.push({
    id: Date.now().toString(),
    title: 'Payment Verification Failed',
    type: 'warning',
    priority: 'important',
    targetRole: 'tenant',
    targetUser: p.tenant,
    by: 'Admin',
    message: `Payment transaction ${p.transactionId} of ₹${(p.amount || 0).toLocaleString()} for ${p.property} was rejected by Admin. Please re-check your payment details.`,
    sentAt: new Date().toLocaleString()
  });
  localStorage.setItem('cross_notifications', JSON.stringify(notifs));

  saveData();
  renderPayments();

  showToast('error', 'Payment Rejected', `Transaction ${p.transactionId} marked as rejected and tenant notified.`);
}

// ===== PAYMENT VERIFICATION & CREDENTIAL GENERATION =====
function verifyPaymentAndGenerateCreds(id) {
  const p = payments.find(x => x.id === id);
  if (!p) return;
  p.status = 'verified';
  p.clearance = 'Approved';

  const cleanName = (p.tenant || 'tenant').toLowerCase().replace(/[^a-z0-9]/g, '');
  const tenantUsername = cleanName + Math.floor(100 + Math.random() * 900);
  const tenantPassword = "PG" + Math.floor(100000 + Math.random() * 900000);

  let tenantCreds = JSON.parse(localStorage.getItem('tenant_credentials') || '[]');
  tenantCreds.unshift({
    id: Date.now(),
    tenant: p.tenant,
    property: p.property,
    room: p.room,
    username: tenantUsername,
    password: tenantPassword,
    generatedAt: new Date().toLocaleString()
  });
  localStorage.setItem('tenant_credentials', JSON.stringify(tenantCreds));

  localStorage.setItem('global_payments', JSON.stringify(payments));

  let notifs = JSON.parse(localStorage.getItem('cross_notifications') || '[]');
  notifs.push({
    id: Date.now().toString(),
    title: 'Tenant Credentials Generated',
    type: 'update',
    priority: 'important',
    targetRole: 'tenant',
    targetUser: p.tenant,
    by: 'Admin',
    message: `Payment Verified! Tenant Login Credentials for ${p.property}: Username: ${tenantUsername} | Password: ${tenantPassword}`,
    sentAt: new Date().toLocaleString()
  });
  localStorage.setItem('cross_notifications', JSON.stringify(notifs));

  saveData();
  renderPayments();

  showInfoModal(
    '🔑 Tenant Credentials Generated',
    `Payment TXN: ${p.transactionId} Verified`,
    `<div style="display:grid;gap:12px;font-size:13px;text-align:left;">
      <div style="background:#eff6ff;padding:12px;border-radius:8px;border:1px solid #bfdbfe;">
        <strong style="color:#1e3a8a;display:block;margin-bottom:6px;">Login Credentials Generated & Sent to Tenant:</strong>
        <div><strong>Username:</strong> <code style="background:#fff;padding:2px 6px;border-radius:4px;color:#1d4ed8;">${tenantUsername}</code></div>
        <div style="margin-top:4px;"><strong>Password:</strong> <code style="background:#fff;padding:2px 6px;border-radius:4px;color:#1d4ed8;">${tenantPassword}</code></div>
      </div>
      <div><strong>Tenant Name:</strong> ${p.tenant}</div>
      <div><strong>Property / Room:</strong> ${p.property} (${p.room})</div>
      <div><strong>Amount Paid:</strong> ₹${p.amount.toLocaleString()}</div>
      <div style="color:#15803d;font-weight:600;">✓ The tenant has been notified with these credentials.</div>
    </div>`
  );
}

// ===== TOP EARNING PROPERTIES =====
function renderTopEarningProperties() {
  const c = document.getElementById('top-properties-chart');
  if (!c) return;

  // Aggregate verified payments by property
  const propEarnings = {};
  payments.filter(p => p.status === 'verified').forEach(p => {
    propEarnings[p.property] = (propEarnings[p.property] || 0) + p.amount;
  });

  const sorted = Object.entries(propEarnings)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  if (sorted.length === 0) {
    c.innerHTML = '<p style="color:#94a3b8;font-size:12px;text-align:center;padding:20px">No data yet</p>';
    return;
  }

  const maxVal = sorted[0][1];
  c.innerHTML = sorted.map(([name, amount]) => `
    <div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
        <span style="font-weight:500;color:#0f172a;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name}</span>
        <span style="color:#16a34a;font-weight:600">₹${amount.toLocaleString()}</span>
      </div>
      <div style="background:#f1f5f9;border-radius:4px;height:8px;overflow:hidden">
        <div style="width:${(amount / maxVal) * 100}%;background:#16a34a;height:100%;border-radius:4px;transition:width 0.4s"></div>
      </div>
      <div style="font-size:10px;color:#94a3b8;margin-top:2px">Commission: ₹${Math.round(amount * 0.10).toLocaleString()}</div>
    </div>
  `).join('');
}

// ===== REVENUE TREND CHART =====
function renderPayRevChart() {
  const c = document.getElementById('pay-rev-chart');
  if (!c) return;
  const data = [160000, 175000, 185000, 190000, 210000, 240000];
  const max  = Math.max(...data);
  const w = 300, h = 120, pad = 10;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v / max) * (h - pad * 2));
    return `${x},${y}`;
  }).join(' ');
  c.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:100%">
      <polyline points="${pts}" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${data.map((v, i) => {
        const x = pad + (i / (data.length - 1)) * (w - pad * 2);
        const y = h - pad - ((v / max) * (h - pad * 2));
        return `<circle cx="${x}" cy="${y}" r="4" fill="white" stroke="#16a34a" stroke-width="2"/>`;
      }).join('')}
    </svg>`;
}

// ===== PAYMENT ACTIONS =====
function approveClearance(id) {
  const p = payments.find(x => x.id === id);
  if (!p) return;
  p.clearance = 'Approved';
  saveData(); renderPayments();
  showToast('success', 'Clearance Approved', `Refund now unlocked for ${p.tenant}`);
}

function issueRefund(id) {
  const p = payments.find(x => x.id === id);
  if (!p) return;
  if (p.clearance !== 'Approved') {
    showToast('error', 'Clearance Required', 'Warden/Owner approval needed before issuing refund');
    return;
  }
  showToast('info', 'Refund Initiated', `Refund of ₹${p.amount.toLocaleString()} to ${p.tenant} initiated`);
}

function viewPayment(id) {
  const p = payments.find(x => x.id === id);
  if (!p) return;
  showInfoModal('💰 Payment Details', `Transaction: ${p.transactionId}`,
    `<div style="display:grid;gap:10px;font-size:13px">
      <div><strong>Tenant:</strong> ${p.tenant}</div>
      <div><strong>Property:</strong> ${p.property}</div>
      <div><strong>Room:</strong> ${p.room}</div>
      <div><strong>Amount:</strong> ₹${p.amount.toLocaleString()}</div>
      <div><strong>Platform Commission (10%):</strong> ₹${Math.round(p.amount * 0.10).toLocaleString()}</div>
      <div><strong>Method:</strong> ${p.method}</div>
      <div><strong>Transaction ID:</strong> ${p.transactionId}</div>
      <div><strong>Date:</strong> ${p.paidDate}</div>
      <div><strong>Status:</strong> <span class="badge badge-${p.status}">${cap(p.status)}</span></div>
      <div><strong>Clearance:</strong> ${p.clearance || 'Pending'}</div>
    </div>`
  );
}

// ===== FILTERS =====
function setupPaymentFilters() {
  const s  = document.getElementById('pay-search');
  if (s) s.oninput = () => renderPayments(s.value);
}
