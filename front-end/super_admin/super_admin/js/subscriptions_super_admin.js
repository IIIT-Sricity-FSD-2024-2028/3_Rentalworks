// ===================================================
//  subscriptions_super_admin.js
//  Handles: Global Subscription & Revenue Metrics,
//           Owner Plan Overview, and Payment Verification
//           for Super Admin portal
// ===================================================

let superAdminSubscriptionsData = [];
let superAdminPaymentsData = [];
let currentSuperAdminSubTab = 'subs';

async function renderSubscriptions() {
  await loadSuperAdminSubscriptions();
}

async function loadSuperAdminSubscriptions() {
  try {
    const headers = { 'x-role': 'super_admin' };

    // 1. Fetch live aggregated statistics
    const statsRes = await fetch('http://localhost:3000/subscriptions/admin/stats', { headers });
    if (statsRes.ok) {
      const stats = await statsRes.json();
      const s = stats.subscriptions || {};
      const p = stats.payments || {};

      const revEl = document.getElementById('sa-total-revenue');
      const activeEl = document.getElementById('sa-active-subs');
      const succEl = document.getElementById('sa-successful-payments');
      const failEl = document.getElementById('sa-failed-payments');

      const monthlyEl = document.getElementById('sa-monthly-subs');
      const yearlyEl = document.getElementById('sa-yearly-subs');
      const lifetimeEl = document.getElementById('sa-lifetime-subs');
      const expiredEl = document.getElementById('sa-expired-subs');

      if (revEl) revEl.textContent = '₹' + Number(p.totalRevenue || 0).toLocaleString('en-IN');
      if (activeEl) activeEl.textContent = s.totalActive || 0;
      if (succEl) succEl.textContent = p.successfulPayments || 0;
      if (failEl) failEl.textContent = p.failedPayments || 0;

      const failedLbl = document.getElementById('sa-failed-lbl');
      if (failedLbl) failedLbl.textContent = `${p.failedPayments || 0} failed`;

      if (monthlyEl) monthlyEl.textContent = s.monthly || 0;
      if (yearlyEl) yearlyEl.textContent = s.yearly || 0;
      if (lifetimeEl) lifetimeEl.textContent = s.lifetime || 0;
      if (expiredEl) expiredEl.textContent = (s.expired || 0) + (s.cancelled || 0);

      // Distribution progress bars
      const totalActive = s.totalActive || 0;
      if (totalActive > 0) {
        const yPct = Math.round(((s.yearly || 0) / totalActive) * 100);
        const mPct = Math.round(((s.monthly || 0) / totalActive) * 100);
        const lPct = Math.round(((s.lifetime || 0) / totalActive) * 100);

        const yPctEl = document.getElementById('sa-bar-yearly-pct');
        const yFillEl = document.getElementById('sa-bar-yearly-fill');
        const mPctEl = document.getElementById('sa-bar-monthly-pct');
        const mFillEl = document.getElementById('sa-bar-monthly-fill');
        const lPctEl = document.getElementById('sa-bar-lifetime-pct');
        const lFillEl = document.getElementById('sa-bar-lifetime-fill');

        if (yPctEl) yPctEl.textContent = `${s.yearly || 0} (${yPct}%)`;
        if (yFillEl) yFillEl.style.width = `${yPct}%`;
        if (mPctEl) mPctEl.textContent = `${s.monthly || 0} (${mPct}%)`;
        if (mFillEl) mFillEl.style.width = `${mPct}%`;
        if (lPctEl) lPctEl.textContent = `${s.lifetime || 0} (${lPct}%)`;
        if (lFillEl) lFillEl.style.width = `${lPct}%`;
      }
    }

    // 2. Fetch all subscriptions
    const subsRes = await fetch('http://localhost:3000/subscriptions/admin/all', { headers });
    if (subsRes.ok) {
      superAdminSubscriptionsData = await subsRes.json();
      filterSuperAdminSubscriptions();
    }

    // 3. Fetch all payments
    const payRes = await fetch('http://localhost:3000/subscriptions/admin/payments', { headers });
    if (payRes.ok) {
      superAdminPaymentsData = await payRes.json();
      filterSuperAdminPayments();
    }

  } catch (err) {
    console.error('Super Admin Subscriptions Error:', err);
  }
}

function switchSuperAdminSubTab(tab) {
  currentSuperAdminSubTab = tab;
  const btnSubs = document.getElementById('sa-tab-subs');
  const btnPays = document.getElementById('sa-tab-payments');
  const viewSubs = document.getElementById('sa-view-subs');
  const viewPays = document.getElementById('sa-view-payments');

  if (tab === 'subs') {
    if (btnSubs) { btnSubs.className = 'btn-primary-admin'; btnSubs.style.background = ''; btnSubs.style.color = ''; }
    if (btnPays) { btnPays.className = 'btn-secondary-admin'; btnPays.style.background = '#f1f5f9'; btnPays.style.color = '#334155'; }
    if (viewSubs) viewSubs.style.display = 'block';
    if (viewPays) viewPays.style.display = 'none';
  } else {
    if (btnSubs) { btnSubs.className = 'btn-secondary-admin'; btnSubs.style.background = '#f1f5f9'; btnSubs.style.color = '#334155'; }
    if (btnPays) { btnPays.className = 'btn-primary-admin'; btnPays.style.background = '#2563eb'; btnPays.style.color = '#ffffff'; }
    if (viewSubs) viewSubs.style.display = 'none';
    if (viewPays) viewPays.style.display = 'block';
  }
}

function filterSuperAdminSubscriptions() {
  const tbody = document.getElementById('sa-subscriptions-tbody');
  if (!tbody) return;

  const search = (document.getElementById('sa-sub-search')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('sa-sub-status-filter')?.value || 'ALL';
  const planFilter = document.getElementById('sa-sub-plan-filter')?.value || 'ALL';

  let filtered = superAdminSubscriptionsData.filter(sub => {
    const ownerName = (sub.owner?.name || '').toLowerCase();
    const ownerEmail = (sub.owner?.email || '').toLowerCase();
    const receipt = (sub.receiptNumber || '').toLowerCase();
    const matchesSearch = !search || ownerName.includes(search) || ownerEmail.includes(search) || receipt.includes(search);
    
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
    let badgeColor = 'background:#ecfdf5;color:#15803d;';
    if (subStatus === 'EXPIRED') badgeColor = 'background:#fef2f2;color:#b91c1c;';
    if (subStatus === 'CANCELLED') badgeColor = 'background:#f1f5f9;color:#64748b;';

    const isLifetime = s.planType === 'LIFETIME';
    const expiryText = isLifetime ? '<span style="color:#10b981;font-weight:700;">Lifetime (Never)</span>' : (s.endDate || '—');

    return `
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:14px 16px;">
          <div style="font-weight:700;color:#0f172a;">${s.owner?.name || 'Owner #' + s.ownerId}</div>
          <div style="font-size:12px;color:#64748b;">${s.owner?.email || '—'} · ${s.owner?.phone || ''}</div>
        </td>
        <td style="padding:14px 16px;">
          <span style="font-weight:700;color:#1e40af;">${s.plan?.displayName || s.planType}</span>
        </td>
        <td style="padding:14px 16px;font-weight:800;color:#0f172a;">
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
            <button class="btn-action-small" onclick="viewSuperAdminReceipt(${s.paymentId})" style="padding:4px 10px;background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;border-radius:6px;font-weight:600;font-size:11px;cursor:pointer;">
              Receipt
            </button>
          ` : '—'}
        </td>
      </tr>
    `;
  }).join('');
}

function filterSuperAdminPayments() {
  const tbody = document.getElementById('sa-payments-tbody');
  if (!tbody) return;

  const search = (document.getElementById('sa-pay-search')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('sa-pay-status-filter')?.value || 'ALL';

  let filtered = superAdminPaymentsData.filter(p => {
    const ownerName = (p.owner?.name || '').toLowerCase();
    const txId = (p.transactionId || '').toLowerCase();
    const receipt = (p.receiptNumber || '').toLowerCase();
    const matchesSearch = !search || ownerName.includes(search) || txId.includes(search) || receipt.includes(search);
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:30px;color:#94a3b8;">No matching payment transactions found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const isSuccess = p.status === 'SUCCESS';
    return `
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:14px 16px;font-weight:600;color:#0f172a;font-size:13px;">${p.paymentDate}</td>
        <td style="padding:14px 16px;">
          <div style="font-weight:600;color:#0f172a;">${p.owner?.name || 'Owner #' + p.ownerId}</div>
          <div style="font-size:12px;color:#64748b;">${p.owner?.email || ''}</div>
        </td>
        <td style="padding:14px 16px;font-weight:600;color:#1e40af;">${p.subscription?.plan?.displayName || p.planType}</td>
        <td style="padding:14px 16px;font-weight:700;color:#0f172a;">₹${Number(p.amount).toLocaleString('en-IN')}</td>
        <td style="padding:14px 16px;font-size:12px;color:#475569;">${p.paymentMethod || 'Gateway'}</td>
        <td style="padding:14px 16px;font-family:monospace;font-size:12px;color:#64748b;">${p.transactionId}</td>
        <td style="padding:14px 16px;">
          <span style="display:inline-block;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700;${isSuccess ? 'background:#ecfdf5;color:#15803d;' : 'background:#fef2f2;color:#b91c1c;'}">
            ${isSuccess ? 'Paid' : p.status}
          </span>
        </td>
        <td style="padding:14px 16px;font-family:monospace;font-size:12px;color:#64748b;">${p.receiptNumber}</td>
        <td style="padding:14px 16px;text-align:right;">
          <button class="btn-action-small" onclick="viewSuperAdminReceipt(${p.id})" style="padding:4px 10px;background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;border-radius:6px;font-weight:600;font-size:11px;cursor:pointer;">
            View Receipt
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

async function viewSuperAdminReceipt(paymentId) {
  try {
    const headers = { 'x-role': 'super_admin' };
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
