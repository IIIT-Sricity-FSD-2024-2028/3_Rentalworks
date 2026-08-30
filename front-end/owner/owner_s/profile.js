// profile.js
let currentSubInfo = null;

document.addEventListener('DOMContentLoaded', async () => {
  await initPage('profile', 'Profile', 'Manage your account information and subscription');
  await loadProfile();
});

async function loadProfile() {
  const data = await fetchData();
  const profile = data.profile || {};
  const properties = data.properties || [];
  const totalRevenue = properties.reduce((s, p) => s + (p.occupiedRooms || 0) * (p.monthlyRent || 0), 0);

  // Fetch real-time subscription details from backend
  const session = getSession();
  if (session && session.role === 'owner') {
    try {
      const headers = { 'x-role': 'owner' };
      if (session.id) headers['x-user-id'] = String(session.id);
      const res = await fetch(`http://localhost:3000/subscriptions/current?ownerId=${session.id || ''}`, { headers });
      if (res.ok) {
        currentSubInfo = await res.json();
      }
    } catch (e) {
      console.warn('Could not fetch real-time subscription info:', e);
    }
  }

  renderProfilePage(profile, properties.length, totalRevenue, currentSubInfo);
}

function renderProfilePage(profile, totalProps, totalRevenue, subInfo) {
  const session = getSession() || {};
  const initials = (profile.name || session.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  // Subscription section data
  const hasSub = subInfo?.hasSubscription;
  const isActive = subInfo?.isActive;
  const status = subInfo?.status || (session.hasActiveSubscription ? 'ACTIVE' : 'NONE');
  const planName = subInfo?.plan?.displayName || subInfo?.subscription?.planType || session.subscriptionPlan || 'No Active Plan';
  const planPrice = subInfo?.subscription?.amount || subInfo?.plan?.price || session.subscriptionFee || 0;
  const startDate = subInfo?.subscription?.startDate ? formatDate(subInfo.subscription.startDate) : '—';
  const isLifetime = subInfo?.subscription?.planType === 'LIFETIME' || planName.toLowerCase().includes('lifetime');
  const endDate = isLifetime ? 'Never (Lifetime Access)' : (subInfo?.subscription?.endDate ? formatDate(subInfo.subscription.endDate) : '—');
  const canUpgrade = subInfo?.canUpgrade;

  let statusBadgeClass = 'badge-active';
  let statusBadgeText = 'Active';
  if (!hasSub || status === 'NONE') {
    statusBadgeClass = 'badge-cancelled';
    statusBadgeText = 'No Subscription';
  } else if (status === 'EXPIRED') {
    statusBadgeClass = 'badge-expired';
    statusBadgeText = 'Expired';
  }

  document.getElementById('pageContent').innerHTML = `
    <!-- Hero -->
    <div class="profile-hero">
      <div class="profile-avatar-large" id="profileAvatarLarge">${initials}</div>
      <div class="profile-hero-info">
        <div class="name">${profile.name || session.name || 'Property Owner'}</div>
        <div class="role">Property Owner</div>
        <div class="email"><span class="material-icons" style="font-size:16px;vertical-align:middle">email</span> ${profile.email || session.email || '—'}</div>
      </div>
      <div class="profile-stats">
        <div class="profile-stat">
          <div class="val">${totalProps}</div>
          <div class="lbl">Properties</div>
        </div>
        <div class="profile-stat">
          <div class="val">${formatCurrency(totalRevenue)}</div>
          <div class="lbl">Monthly Revenue</div>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <!-- Left Column: Personal Info & Location -->
      <div style="display:flex;flex-direction:column;gap:20px">
        <!-- Personal Info -->
        <div class="form-section" style="margin-bottom:0">
          <div class="form-section-header">
            <div class="num-badge">01</div>
            <div class="form-section-title">Personal Information</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:16px">
            <div class="form-group">
              <label class="form-label">Full Name <span class="req">*</span></label>
              <input class="form-input" id="profName" value="${profile.name || session.name || ''}" placeholder="Your full name">
              <span class="form-error">Name is required</span>
            </div>
            <div class="form-group">
              <label class="form-label">Email Address <span class="req">*</span></label>
              <input class="form-input" type="email" id="profEmail" value="${profile.email || session.email || ''}" placeholder="your@email.com">
              <span class="form-error">Valid email is required</span>
            </div>
            <div class="form-group">
              <label class="form-label">Phone Number</label>
              <input class="form-input" id="profPhone" value="${profile.phone || session.phone || ''}" placeholder="+91 00000 00000">
            </div>
            <div class="form-group">
              <label class="form-label">Company / Business Name</label>
              <input class="form-input" id="profCompany" value="${profile.company || ''}" placeholder="Your company name">
            </div>
            <div class="form-group">
              <label class="form-label">Bio</label>
              <textarea class="form-input" id="profBio" rows="2" placeholder="Tell us about yourself...">${profile.bio || ''}</textarea>
            </div>
          </div>
          <div style="margin-top:20px;display:flex;gap:10px">
            <button class="btn btn-primary" style="flex:1" onclick="saveProfile()"><span class="material-icons" style="font-size:16px;vertical-align:middle">save</span> Save Changes</button>
          </div>
        </div>

        <!-- Address -->
        <div class="form-section" style="margin-bottom:0">
          <div class="form-section-header">
            <div class="num-badge">02</div>
            <div class="form-section-title">Location Details</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:14px">
            <div class="form-group">
              <label class="form-label">City</label>
              <input class="form-input" id="profCity" value="${profile.city || ''}" placeholder="Bangalore">
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">State</label>
                <input class="form-input" id="profState" value="${profile.state || ''}" placeholder="Karnataka">
              </div>
              <div class="form-group">
                <label class="form-label">Pincode</label>
                <input class="form-input" id="profPincode" value="${profile.pincode || ''}" placeholder="560001" maxlength="6">
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Payment & Subscription and Security -->
      <div style="display:flex;flex-direction:column;gap:20px">
        
        <!-- SECTION 03: PAYMENT & SUBSCRIPTION -->
        <div class="form-section" style="margin-bottom:0; border: 1.5px solid ${isActive ? '#93c5fd' : '#fecaca'}; background: ${isActive ? '#f8faff' : '#fffaf0'};">
          <div class="form-section-header" style="justify-content:space-between">
            <div style="display:flex;align-items:center;gap:10px">
              <div class="num-badge" style="background:${isActive ? 'var(--primary)' : '#e11d48'}">03</div>
              <div class="form-section-title">Payment & Subscription</div>
            </div>
            <span class="badge ${statusBadgeClass}" style="font-size:12px;padding:4px 10px;">${statusBadgeText}</span>
          </div>

          <div style="background:white; border-radius:12px; padding:18px; border:1px solid #e2e8f0; margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding-bottom:10px; border-bottom:1px solid #f1f5f9;">
              <div>
                <span style="font-size:12px; color:var(--text-muted); display:block;">CURRENT PLAN</span>
                <strong style="font-size:18px; color:#0f172a;">${planName}</strong>
              </div>
              <div style="text-align:right;">
                <span style="font-size:12px; color:var(--text-muted); display:block;">PRICE</span>
                <strong style="font-size:18px; color:var(--primary);">${planPrice ? formatCurrency(planPrice) : '₹0'}</strong>
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:13px; margin-bottom:12px;">
              <div>
                <span style="color:var(--text-muted); display:block; font-size:11px;">STARTED ON</span>
                <strong style="color:#334155;">${startDate}</strong>
              </div>
              <div>
                <span style="color:var(--text-muted); display:block; font-size:11px;">EXPIRES ON</span>
                <strong style="color:${isLifetime ? '#10b981' : '#334155'};">${endDate}</strong>
              </div>
            </div>

            ${!isActive ? `
              <div style="background:#fef2f2; border-radius:8px; padding:10px 12px; color:#991b1b; font-size:12px; display:flex; align-items:center; gap:8px; margin-top:10px;">
                <span class="material-icons" style="font-size:16px">warning</span>
                <span>${status === 'EXPIRED' ? 'Subscription expired. Renewal required to manage properties.' : 'No active subscription found. Choose a plan to unlock all features.'}</span>
              </div>
            ` : ''}
          </div>

          <!-- Subscription Actions -->
          <div style="display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; gap:10px;">
              <button class="btn btn-secondary" style="flex:1; justify-content:center; gap:6px; font-size:13px;" onclick="viewPaymentHistory()">
                <span class="material-icons" style="font-size:16px">receipt_long</span> Payment History
              </button>
              ${subInfo?.subscription?.paymentId || isActive ? `
                <button class="btn btn-secondary" style="flex:1; justify-content:center; gap:6px; font-size:13px;" onclick="viewLatestReceipt()">
                  <span class="material-icons" style="font-size:16px">description</span> View Receipt
                </button>
              ` : ''}
            </div>

            ${canUpgrade ? `
              <a href="subscription.html?reason=upgrade" class="btn btn-primary" style="justify-content:center; gap:8px; text-decoration:none;">
                <span class="material-icons" style="font-size:18px">upgrade</span> Upgrade Subscription Plan
              </a>
            ` : (isLifetime ? `
              <div style="text-align:center; font-size:12px; color:#10b981; font-weight:600; padding:4px 0;">
                ✓ You are on the Lifetime Plan. No renewal or upgrade required!
              </div>
            ` : `
              <a href="subscription.html?reason=${status === 'EXPIRED' ? 'expired' : 'required'}" class="btn btn-primary" style="justify-content:center; gap:8px; text-decoration:none; background:#dc2626;">
                <span class="material-icons" style="font-size:18px">shopping_cart</span> ${status === 'EXPIRED' ? 'Renew Subscription Plan' : 'Choose a Subscription Plan'}
              </a>
            `)}
          </div>
        </div>

        <!-- Security -->
        <div class="form-section" style="margin-bottom:0">
          <div class="form-section-header">
            <div class="num-badge">04</div>
            <div class="form-section-title">Security & Account</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px">
            <button class="btn btn-secondary" style="justify-content:flex-start;gap:12px" onclick="changePassword()">
              <span class="material-icons" style="font-size:18px">lock</span> Change Password
            </button>
            <button class="btn btn-secondary" style="justify-content:flex-start;gap:12px" onclick="enableTwoFactor()">
              <span class="material-icons" style="font-size:18px">security</span> Enable Two-Factor Auth
            </button>
            <button class="btn btn-secondary" style="justify-content:flex-start;gap:12px" onclick="downloadData()">
              <span class="material-icons" style="font-size:18px">download</span> Download My Data
            </button>
            <hr class="divider">
            <button class="btn btn-danger" style="justify-content:flex-start;gap:12px" onclick="logoutAccount()">
              <span class="material-icons" style="font-size:18px">logout</span> Sign Out
            </button>
          </div>
        </div>

      </div>
    </div>
  `;
}

// Payment History Modal
async function viewPaymentHistory() {
  const session = getSession();
  if (!session) return;

  const headers = { 'x-role': 'owner' };
  if (session.id) headers['x-user-id'] = String(session.id);

  try {
    const res = await fetch(`http://localhost:3000/subscriptions/payments?ownerId=${session.id || ''}`, { headers });
    const payments = res.ok ? await res.json() : [];

    let rowsHtml = '';
    if (!payments || payments.length === 0) {
      rowsHtml = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-muted);">No subscription payment records found.</td></tr>`;
    } else {
      rowsHtml = payments.map(p => `
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:12px 10px; font-weight:600; color:#0f172a;">${formatDate(p.paymentDate)}</td>
          <td style="padding:12px 10px;"><span style="font-weight:600; color:#1e40af;">${p.subscription?.plan?.displayName || p.planType}</span></td>
          <td style="padding:12px 10px; font-weight:700;">${formatCurrency(p.amount)}</td>
          <td style="padding:12px 10px; font-size:12px; font-family:monospace; color:#64748b;">${p.transactionId || '—'}</td>
          <td style="padding:12px 10px;">
            <span class="badge ${p.status === 'SUCCESS' ? 'badge-active' : 'badge-expired'}" style="font-size:11px;">
              ${p.status === 'SUCCESS' ? 'Paid' : p.status}
            </span>
          </td>
          <td style="padding:12px 10px; text-align:right;">
            <button class="btn btn-secondary" style="padding:4px 10px; font-size:11px;" onclick="viewReceiptById(${p.id})">
              <span class="material-icons" style="font-size:14px;vertical-align:middle">visibility</span> Receipt
            </button>
          </td>
        </tr>
      `).join('');
    }

    openModal(`
      <div class="modal-header">
        <span class="modal-title"><span class="material-icons" style="font-size:22px;vertical-align:middle">receipt_long</span> Payment & Subscription History</span>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div style="max-height:60vh; overflow-y:auto; margin-top:10px;">
        <table style="width:100%; border-collapse:collapse; font-size:13px; text-align:left;">
          <thead>
            <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0; color:var(--text-muted); font-size:11px; text-transform:uppercase;">
              <th style="padding:10px;">Date</th>
              <th style="padding:10px;">Plan</th>
              <th style="padding:10px;">Amount</th>
              <th style="padding:10px;">Transaction ID</th>
              <th style="padding:10px;">Status</th>
              <th style="padding:10px; text-align:right;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Close</button>
      </div>
    `);
  } catch (e) {
    showToast('Failed to load payment history', 'error');
  }
}

// View Latest Receipt Modal
async function viewLatestReceipt() {
  if (currentSubInfo?.subscription?.paymentId) {
    await viewReceiptById(currentSubInfo.subscription.paymentId);
  } else {
    // Look up latest payment from history
    const session = getSession();
    try {
      const headers = { 'x-role': 'owner' };
      if (session.id) headers['x-user-id'] = String(session.id);
      const res = await fetch(`http://localhost:3000/subscriptions/payments?ownerId=${session.id || ''}`, { headers });
      const payments = res.ok ? await res.json() : [];
      if (payments.length > 0) {
        await viewReceiptById(payments[0].id);
      } else {
        showToast('No receipt record found.', 'info');
      }
    } catch (e) {
      showToast('Could not load receipt.', 'error');
    }
  }
}

// View Receipt by Payment ID Modal
async function viewReceiptById(paymentId) {
  const session = getSession();
  const headers = { 'x-role': 'owner' };
  if (session.id) headers['x-user-id'] = String(session.id);

  try {
    const res = await fetch(`http://localhost:3000/subscriptions/payments/${paymentId}/receipt?ownerId=${session.id || ''}`, { headers });
    if (!res.ok) {
      showToast('Receipt not found.', 'error');
      return;
    }
    const receipt = await res.json();

    openModal(`
      <div class="modal-header">
        <span class="modal-title"><span class="material-icons" style="font-size:22px;vertical-align:middle;color:#10b981">verified</span> Subscription Invoice & Receipt</span>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div style="padding:10px 0;">
        <div style="border:1px dashed #cbd5e1; border-radius:12px; padding:20px; background:#fafafa;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:12px; margin-bottom:16px;">
            <div>
              <div style="font-weight:800; font-size:16px; color:#0f172a;">RentBro Property Management</div>
              <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">Receipt No: <strong>${receipt.receiptNumber}</strong></div>
            </div>
            <span class="badge badge-active" style="padding:4px 10px; font-size:12px;">${receipt.status}</span>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:13px; margin-bottom:16px;">
            <div>
              <span style="color:var(--text-muted); font-size:11px; display:block;">BILLED TO</span>
              <strong style="color:#0f172a;">${receipt.ownerName}</strong>
              <div style="color:var(--text-muted); font-size:11px;">${receipt.ownerEmail}</div>
            </div>
            <div>
              <span style="color:var(--text-muted); font-size:11px; display:block;">TRANSACTION ID</span>
              <strong style="font-family:monospace; color:#0f172a;">${receipt.transactionId}</strong>
            </div>
            <div>
              <span style="color:var(--text-muted); font-size:11px; display:block;">PLAN</span>
              <strong style="color:#1e40af;">${receipt.planName}</strong>
            </div>
            <div>
              <span style="color:var(--text-muted); font-size:11px; display:block;">AMOUNT</span>
              <strong style="color:#0f172a; font-size:15px;">${formatCurrency(receipt.amount)}</strong>
            </div>
            <div>
              <span style="color:var(--text-muted); font-size:11px; display:block;">VALID FROM</span>
              <strong>${formatDate(receipt.startDate)}</strong>
            </div>
            <div>
              <span style="color:var(--text-muted); font-size:11px; display:block;">EXPIRES ON</span>
              <strong style="color:${receipt.endDate === 'Lifetime' ? '#10b981' : '#0f172a'}">${receipt.endDate === 'Lifetime' ? 'Lifetime (Never Expires)' : formatDate(receipt.endDate)}</strong>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="window.print()"><span class="material-icons" style="font-size:16px">print</span> Print Receipt</button>
        <button class="btn btn-primary" onclick="closeModal()">Done</button>
      </div>
    `);
  } catch (e) {
    showToast('Failed to load receipt details', 'error');
  }
}

async function saveProfile() {
  const name = document.getElementById('profName').value.trim();
  const email = document.getElementById('profEmail').value.trim();

  if (!name) { showToast('Name is required', 'error'); return; }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('Valid email is required', 'error'); return;
  }

  const data = getData();
  if (!data) return;

  data.profile = {
    ...data.profile,
    name,
    email,
    phone: document.getElementById('profPhone').value.trim(),
    company: document.getElementById('profCompany').value.trim(),
    bio: document.getElementById('profBio').value.trim(),
    city: document.getElementById('profCity').value.trim(),
    state: document.getElementById('profState').value.trim(),
    pincode: document.getElementById('profPincode').value.trim(),
  };

  updateData(data);
  showToast('Profile updated successfully!', 'success');
  loadProfile();

  // Update hero
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const avatarEl = document.getElementById('profileAvatarLarge');
  if (avatarEl) avatarEl.textContent = initials;
}

function changePassword() {
  openModal(`
    <div class="modal-header">
      <span class="modal-title"><span class="material-icons" style="font-size:22px;vertical-align:middle">lock</span> Change Password</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="form-group">
        <label class="form-label">Current Password</label>
        <input type="password" class="form-input" id="currPass" placeholder="Enter current password">
      </div>
      <div class="form-group">
        <label class="form-label">New Password</label>
        <input type="password" class="form-input" id="newPass" placeholder="Enter new password">
      </div>
      <div class="form-group">
        <label class="form-label">Confirm New Password</label>
        <input type="password" class="form-input" id="confPass" placeholder="Confirm new password">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitChangePassword()">Update Password</button>
    </div>
  `);
}

function submitChangePassword() {
  const curr = document.getElementById('currPass').value;
  const newP = document.getElementById('newPass').value;
  const conf = document.getElementById('confPass').value;
  if (!curr || !newP) { showToast('Please fill all fields', 'error'); return; }
  if (newP !== conf) { showToast('Passwords do not match', 'error'); return; }
  if (newP.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
  closeModal();
  showToast('Password updated successfully!', 'success');
}

function enableTwoFactor() {
  openModal(`
    <div class="modal-header">
      <span class="modal-title"><span class="material-icons" style="font-size:22px;vertical-align:middle">security</span> Two-Factor Authentication</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div style="text-align:center;padding:20px 0">
      <div style="font-size:48px;margin-bottom:16px"><span class="material-icons" style="font-size:48px;color:var(--primary)">qr_code_2</span></div>
      <p style="font-size:14px;color:var(--text-body);margin-bottom:16px">Scan the QR code below with your authenticator app (Google Authenticator, Authy, etc.)</p>
      <div style="background:var(--bg-main);border-radius:12px;padding:20px;display:inline-block;margin-bottom:16px">
        <div style="font-size:11px;color:var(--text-muted);letter-spacing:3px">QR CODE PLACEHOLDER</div>
        <div style="font-size:30px;margin:8px 0"><span class="material-icons" style="font-size:30px;color:var(--text-muted)">grid_on</span></div>
        <div style="font-size:12px;font-family:monospace;background:#fff;padding:6px 10px;border-radius:6px;border:1px solid var(--border)">JBSW Y3DP EHPK 3PXP</div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="closeModal();showToast('2FA enabled!','success')"><span class="material-icons" style="font-size:16px;vertical-align:middle">check</span> Enable 2FA</button>
    </div>
  `);
}

function downloadData() {
  const data = getData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pg-manager-data.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Data downloaded successfully!', 'success');
}

function logoutAccount() {
  confirmDialog('Sign Out', 'Are you sure you want to sign out of PG Manager?', () => {
    closeModal();
    showToast('Signed out successfully', 'success');
    setTimeout(() => {
      sessionStorage.removeItem(SESSION_KEY);
      window.location.href = '../../login/login/login.html';
    }, 1000);
  });
}