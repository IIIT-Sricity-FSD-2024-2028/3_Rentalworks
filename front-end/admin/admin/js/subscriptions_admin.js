// ===================================================
//  subscriptions_admin.js
//  Handles: Owner Subscriptions list, status filters,
//           and receipt inspection for Admin portal
// ===================================================

let adminSubscriptionsData = [];

async function renderSubscriptions() {
  await loadAdminSubscriptions();
}

async function loadAdminSubscriptions() {
  const tbody = document.getElementById('admin-subscriptions-tbody');
  if (!tbody) return;

  try {
    const headers = { 'x-role': 'admin' };
    
    // Fetch stats
    const statsRes = await fetch('http://localhost:3000/subscriptions/admin/stats', { headers });
    if (statsRes.ok) {
      const stats = await statsRes.json();
      const s = stats.subscriptions || {};
      const p = stats.payments || {};
      const activeEl = document.getElementById('admin-sub-active');
      const monthlyEl = document.getElementById('admin-sub-monthly');
      const yearlyEl = document.getElementById('admin-sub-yearly');
      const lifetimeEl = document.getElementById('admin-sub-lifetime');
      const revEl = document.getElementById('admin-sub-est-revenue');

      const totalActive = s.totalActive || 0;
      if (activeEl) activeEl.textContent = totalActive;
      if (monthlyEl) monthlyEl.textContent = s.monthly || 0;
      if (yearlyEl) yearlyEl.textContent = s.yearly || 0;
      if (lifetimeEl) lifetimeEl.textContent = s.lifetime || 0;
      if (revEl) revEl.textContent = '₹' + Number(p.totalRevenue || 0).toLocaleString('en-IN');

      // Distribution progress bars
      if (totalActive > 0) {
        const yPct = Math.round(((s.yearly || 0) / totalActive) * 100);
        const mPct = Math.round(((s.monthly || 0) / totalActive) * 100);
        const lPct = Math.round(((s.lifetime || 0) / totalActive) * 100);

        const yPctEl = document.getElementById('admin-bar-yearly-pct');
        const yFillEl = document.getElementById('admin-bar-yearly-fill');
        const mPctEl = document.getElementById('admin-bar-monthly-pct');
        const mFillEl = document.getElementById('admin-bar-monthly-fill');
        const lPctEl = document.getElementById('admin-bar-lifetime-pct');
        const lFillEl = document.getElementById('admin-bar-lifetime-fill');

        if (yPctEl) yPctEl.textContent = `${s.yearly || 0} (${yPct}%)`;
        if (yFillEl) yFillEl.style.width = `${yPct}%`;
        if (mPctEl) mPctEl.textContent = `${s.monthly || 0} (${mPct}%)`;
        if (mFillEl) mFillEl.style.width = `${mPct}%`;
        if (lPctEl) lPctEl.textContent = `${s.lifetime || 0} (${lPct}%)`;
        if (lFillEl) lFillEl.style.width = `${lPct}%`;
      }
    }

    // Fetch all subscriptions
    const res = await fetch('http://localhost:3000/subscriptions/admin/all', { headers });
    if (res.ok) {
      adminSubscriptionsData = await res.json();
      filterAdminSubscriptions();
    } else {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:#dc2626;">Failed to load subscriptions from server.</td></tr>`;
    }
  } catch (err) {
    console.error('Error loading subscriptions:', err);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:#dc2626;">Network error while connecting to server.</td></tr>`;
  }
}

function filterAdminSubscriptions() {
  const tbody = document.getElementById('admin-subscriptions-tbody');
  if (!tbody) return;

  const search = (document.getElementById('sub-search-input')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('sub-status-filter')?.value || 'ALL';
  const planFilter = document.getElementById('sub-plan-filter')?.value || 'ALL';

  let filtered = adminSubscriptionsData.filter(sub => {
    const ownerName = (sub.owner?.name || '').toLowerCase();
    const receipt = (sub.receiptNumber || '').toLowerCase();
    const matchesSearch = !search || ownerName.includes(search) || receipt.includes(search);
    
    const subStatus = sub.evaluatedStatus || sub.status;
    const matchesStatus = statusFilter === 'ALL' || subStatus === statusFilter;
    const matchesPlan = planFilter === 'ALL' || sub.planType === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:#94a3b8;">No matching subscriptions found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(s => {
    const subStatus = s.evaluatedStatus || s.status;
    let badgeColor = 'background:#ecfdf5;color:#15803d;'; // active green
    if (subStatus === 'EXPIRED') badgeColor = 'background:#fef2f2;color:#b91c1c;';
    if (subStatus === 'CANCELLED') badgeColor = 'background:#f1f5f9;color:#64748b;';

    const isLifetime = s.planType === 'LIFETIME';
    const expiryText = isLifetime ? '<span style="color:#10b981;font-weight:600;">Lifetime (Never)</span>' : (s.endDate || '—');

    return `
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:14px 16px;">
          <div style="font-weight:600;color:#0f172a;">${s.owner?.name || 'Owner #' + s.ownerId}</div>
          <div style="font-size:12px;color:#94a3b8;">${s.owner?.email || ''}</div>
        </td>
        <td style="padding:14px 16px;">
          <span style="font-weight:600;color:#1e40af;">${s.plan?.displayName || s.planType}</span>
        </td>
        <td style="padding:14px 16px;font-weight:700;color:#0f172a;">
          ₹${Number(s.amount).toLocaleString('en-IN')}
        </td>
        <td style="padding:14px 16px;color:#475569;font-size:13px;">${s.startDate}</td>
        <td style="padding:14px 16px;font-size:13px;">${expiryText}</td>
        <td style="padding:14px 16px;">
          <span style="display:inline-block;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700;${badgeColor}">
            ${subStatus}
          </span>
        </td>
        <td style="padding:14px 16px;font-family:monospace;font-size:12px;color:#64748b;">
          ${s.receiptNumber || '—'}
        </td>
        <td style="padding:14px 16px;text-align:right;">
          ${s.paymentId ? `
            <button class="btn-action-small" onclick="viewAdminSubscriptionReceipt(${s.paymentId})" style="padding:4px 10px;background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;border-radius:6px;font-weight:600;font-size:11px;cursor:pointer;">
              View Receipt
            </button>
          ` : '—'}
        </td>
      </tr>
    `;
  }).join('');
}

async function viewAdminSubscriptionReceipt(paymentId) {
  try {
    const headers = { 'x-role': 'admin' };
    const res = await fetch(`http://localhost:3000/subscriptions/payments/${paymentId}/receipt`, { headers });
    if (!res.ok) {
      showToast('error', 'Error', 'Receipt not found');
      return;
    }
    const receipt = await res.json();

    const bodyHtml = `
      <div style="padding:10px 0;">
        <div style="border:1px dashed #cbd5e1; border-radius:12px; padding:20px; background:#fafafa;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:12px; margin-bottom:16px;">
            <div>
              <div style="font-weight:800; font-size:16px; color:#0f172a;">RentBro Property Management</div>
              <div style="font-size:12px; color:#64748b; margin-top:2px;">Receipt No: <strong>${receipt.receiptNumber}</strong></div>
            </div>
            <span style="background:#dcfce7;color:#15803d;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;">${receipt.status}</span>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:13px; margin-bottom:16px;">
            <div>
              <span style="color:#64748b; font-size:11px; display:block;">OWNER</span>
              <strong style="color:#0f172a;">${receipt.ownerName}</strong>
              <div style="color:#64748b; font-size:11px;">${receipt.ownerEmail}</div>
            </div>
            <div>
              <span style="color:#64748b; font-size:11px; display:block;">TRANSACTION ID</span>
              <strong style="font-family:monospace; color:#0f172a;">${receipt.transactionId}</strong>
            </div>
            <div>
              <span style="color:#64748b; font-size:11px; display:block;">PLAN</span>
              <strong style="color:#1e40af;">${receipt.planName}</strong>
            </div>
            <div>
              <span style="color:#64748b; font-size:11px; display:block;">AMOUNT PAID</span>
              <strong style="color:#0f172a; font-size:15px;">₹${Number(receipt.amount).toLocaleString('en-IN')}</strong>
            </div>
            <div>
              <span style="color:#64748b; font-size:11px; display:block;">VALID FROM</span>
              <strong>${receipt.startDate}</strong>
            </div>
            <div>
              <span style="color:#64748b; font-size:11px; display:block;">EXPIRES ON</span>
              <strong style="color:${receipt.endDate === 'Lifetime' ? '#10b981' : '#0f172a'}">${receipt.endDate}</strong>
            </div>
          </div>
        </div>
      </div>
    `;

    openModal('Subscription Receipt Details', '', bodyHtml, `
      <button class="btn-confirm-blue" onclick="closeModal()">Close</button>
    `);
  } catch (e) {
    showToast('error', 'Error', 'Failed to fetch receipt');
  }
}
