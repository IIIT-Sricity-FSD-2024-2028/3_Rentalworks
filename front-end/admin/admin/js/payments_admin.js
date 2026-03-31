// ===================================================
//  payments_admin.js
//  Handles: Payments ledger (verified only), GTV,
//           Platform Revenue, Top Earning Properties,
//           Refund clearance logic
// ===================================================

function renderPayments(search = '', statusF = 'verified') {
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

  // Ledger — show only verified, filter by search
  let filtered = verifiedPayments.filter(p => {
    return !search ||
      p.tenant.toLowerCase().includes(search.toLowerCase()) ||
      p.property.toLowerCase().includes(search.toLowerCase()) ||
      p.transactionId.toLowerCase().includes(search.toLowerCase());
  });

  const tbody = document.getElementById('payments-tbody');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#94a3b8;padding:24px">No verified transactions found</td></tr>`;
  } else {
    tbody.innerHTML = filtered.map(p => {
      const clearance       = p.clearance || 'Pending';
      const refundDisabled  = clearance !== 'Approved';
      const refundStyle     = refundDisabled
        ? 'opacity:0.4;cursor:not-allowed;pointer-events:none'
        : '';
      return `
        <tr>
          <td><strong>${p.tenant}</strong></td>
          <td style="font-size:12px">${p.property}</td>
          <td><span class="room-chip">${p.room}</span></td>
          <td style="font-weight:600">₹${p.amount.toLocaleString()}</td>
          <td style="font-size:12px">${p.method}</td>
          <td style="font-size:11px;color:#475569">${p.transactionId}</td>
          <td style="font-size:12px">${p.paidDate}</td>
          <td><span class="badge badge-${p.status}">${cap(p.status)}</span></td>
          <td>
            <span style="font-size:11px;padding:2px 8px;border-radius:20px;font-weight:600;background:${clearance === 'Approved' ? '#dcfce7' : '#fef9c3'};color:${clearance === 'Approved' ? '#15803d' : '#b45309'}">
              ${clearance}
            </span>
          </td>
          <td>
            <div class="act-icons">
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
