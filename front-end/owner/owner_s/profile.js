// profile.js
document.addEventListener('DOMContentLoaded', async () => {
  await initPage('profile', 'Profile', 'Manage your account information');
  await loadProfile();
});

async function loadProfile() {
  const data = await fetchData();
  const profile = data.profile || {};
  const properties = data.properties || [];
  const totalRevenue = properties.reduce((s, p) => s + (p.occupiedRooms || 0) * (p.monthlyRent || 0), 0);
  renderProfilePage(profile, properties.length, totalRevenue);
}

function renderProfilePage(profile, totalProps, totalRevenue) {
  const initials = (profile.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  document.getElementById('pageContent').innerHTML = `
    <!-- Hero -->
    <div class="profile-hero">
      <div class="profile-avatar-large" id="profileAvatarLarge">${initials}</div>
      <div class="profile-hero-info">
        <div class="name">${profile.name || 'Owner'}</div>
        <div class="role">Property Owner</div>
        <div class="email">📧 ${profile.email || '—'}</div>
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
      <!-- Personal Info -->
      <div class="form-section" style="margin-bottom:0">
        <div class="form-section-header">
          <div class="num-badge">01</div>
          <div class="form-section-title">Personal Information</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="form-group">
            <label class="form-label">Full Name <span class="req">*</span></label>
            <input class="form-input" id="profName" value="${profile.name || ''}" placeholder="Your full name">
            <span class="form-error">Name is required</span>
          </div>
          <div class="form-group">
            <label class="form-label">Email Address <span class="req">*</span></label>
            <input class="form-input" type="email" id="profEmail" value="${profile.email || ''}" placeholder="your@email.com">
            <span class="form-error">Valid email is required</span>
          </div>
          <div class="form-group">
            <label class="form-label">Phone Number</label>
            <input class="form-input" id="profPhone" value="${profile.phone || ''}" placeholder="+91 00000 00000">
          </div>
          <div class="form-group">
            <label class="form-label">Company / Business Name</label>
            <input class="form-input" id="profCompany" value="${profile.company || ''}" placeholder="Your company name">
          </div>
          <div class="form-group">
            <label class="form-label">Bio</label>
            <textarea class="form-input" id="profBio" rows="3" placeholder="Tell us about yourself...">${profile.bio || ''}</textarea>
          </div>
        </div>
        <div style="margin-top:20px;display:flex;gap:10px">
          <button class="btn btn-primary" style="flex:1" onclick="saveProfile()">💾 Save Changes</button>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:20px">
        <!-- Address -->
        <div class="form-section" style="margin-bottom:0">
          <div class="form-section-header">
            <div class="num-badge">02</div>
            <div class="form-section-title">Location</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:14px">
            <div class="form-group">
              <label class="form-label">City</label>
              <input class="form-input" id="profCity" value="${profile.city || ''}" placeholder="Chennai">
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">State</label>
                <input class="form-input" id="profState" value="${profile.state || ''}" placeholder="Tamil Nadu">
              </div>
              <div class="form-group">
                <label class="form-label">Pincode</label>
                <input class="form-input" id="profPincode" value="${profile.pincode || ''}" placeholder="600001" maxlength="6">
              </div>
            </div>
          </div>
        </div>

        <!-- Security -->
        <div class="form-section" style="margin-bottom:0">
          <div class="form-section-header">
            <div class="num-badge">03</div>
            <div class="form-section-title">Security</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px">
            <button class="btn btn-secondary" style="justify-content:flex-start;gap:12px" onclick="changePassword()">
              🔐 Change Password
            </button>
            <button class="btn btn-secondary" style="justify-content:flex-start;gap:12px" onclick="enableTwoFactor()">
              📱 Enable Two-Factor Auth
            </button>
            <button class="btn btn-secondary" style="justify-content:flex-start;gap:12px" onclick="downloadData()">
              📥 Download My Data
            </button>
            <hr class="divider">
            <button class="btn btn-danger" style="justify-content:flex-start;gap:12px" onclick="logoutAccount()">
              🚪 Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
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
  loadSidebarUser();

  // Update hero
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const avatarEl = document.getElementById('profileAvatarLarge');
  if (avatarEl) avatarEl.textContent = initials;
}

function changePassword() {
  openModal(`
    <div class="modal-header">
      <span class="modal-title">🔐 Change Password</span>
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
      <span class="modal-title">📱 Two-Factor Authentication</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div style="text-align:center;padding:20px 0">
      <div style="font-size:48px;margin-bottom:16px">📱</div>
      <p style="font-size:14px;color:var(--text-body);margin-bottom:16px">Scan the QR code below with your authenticator app (Google Authenticator, Authy, etc.)</p>
      <div style="background:var(--bg-main);border-radius:12px;padding:20px;display:inline-block;margin-bottom:16px">
        <div style="font-size:11px;color:var(--text-muted);letter-spacing:3px">QR CODE PLACEHOLDER</div>
        <div style="font-size:30px;margin:8px 0">🔲</div>
        <div style="font-size:12px;font-family:monospace;background:#fff;padding:6px 10px;border-radius:6px;border:1px solid var(--border)">JBSW Y3DP EHPK 3PXP</div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="closeModal();showToast('2FA enabled!','success')">✅ Enable 2FA</button>
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
    setTimeout(() => window.location.href = 'index.html', 1200);
  });
}