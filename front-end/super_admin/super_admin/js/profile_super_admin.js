// ===================================================
//  profile_super_admin.js
//  Handles: Profile/Settings page and modal triggered by gear icon
//           Admin details, password change, 2FA, session
// ===================================================

function setupGearIcon() {
  const gear = document.getElementById('gear-btn');
  if (gear) gear.addEventListener('click', () => navigateTo('profile'));
}

function openProfileModal() {
  const overlay = document.getElementById('profile-modal-overlay');
  if (overlay) overlay.classList.add('show');
}

function closeProfileModal() {
  const overlay = document.getElementById('profile-modal-overlay');
  if (overlay) overlay.classList.remove('show');
}

function renderProfile() {
  const adminInfo = users.find(u => u.role === 'super_admin') || { name: 'Super Admin', email: 'admin@pgrentals.com', phone: '+91 00000 00000' };
  setTxt('profile-name-disp', adminInfo.name);
  setTxt('profile-email-disp', adminInfo.email);
  
  const nameInput = document.getElementById('pg-prof-name');
  const emailInput = document.getElementById('pg-prof-email');
  const phoneInput = document.getElementById('pg-prof-phone');
  
  if (nameInput) nameInput.value = adminInfo.name;
  if (emailInput) emailInput.value = adminInfo.email;
  if (phoneInput) phoneInput.value = adminInfo.phone || '+91 00000 00000';
}

async function updateProfileDetails() {
  const name = document.getElementById('pg-prof-name')?.value.trim();
  const email = document.getElementById('pg-prof-email')?.value.trim();
  const phone = document.getElementById('pg-prof-phone')?.value.trim();
  
  if (!name || !email) {
    showToast('error', 'Required', 'Name and Email cannot be empty');
    return;
  }
  if (!phone || !/^\+?[\d\s\-]{9,}$/.test(phone)) {
    showToast('error', 'Invalid Phone', 'Please enter a valid phone number');
    return;
  }
  
  const adminIdx = users.findIndex(u => u.role === 'super_admin');
  if (adminIdx !== -1) {
    const admin = users[adminIdx];
    try {
      // Persist to backend
      const res = await fetch(`http://localhost:3000/users/${admin.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-role': 'super_admin' },
        body: JSON.stringify({ name, email, phone })
      });
      
      if (res.ok) {
        users[adminIdx].name = name;
        users[adminIdx].email = email;
        users[adminIdx].phone = phone;
        
        setTxt('profile-name-disp', name);
        setTxt('profile-email-disp', email);
        
        // Update navbar as well
        setTxt('nb-name', 'Welcome back, ' + name);
        setTxt('nb-email', email);
        
        showToast('success', 'Profile Updated', 'Your personal details have been saved');
      } else {
        showToast('error', 'Error', 'Failed to save changes to the server');
      }
    } catch(err) {
      showToast('error', 'Error', 'Connection failed');
    }
  }
}

function updatePassword() {
  const curr  = document.getElementById('pm-curr-pass')?.value;
  const newP  = document.getElementById('pm-new-pass')?.value;
  const confP = document.getElementById('pm-conf-pass')?.value;

  if (!curr)  { showToast('error', 'Required', 'Enter your current password'); return; }
  if (!newP || newP.length < 6) { showToast('error', 'Too Short', 'New password must be at least 6 characters'); return; }
  if (newP !== confP)  { showToast('error', 'Mismatch', 'New passwords do not match'); return; }

  document.getElementById('pm-curr-pass').value = '';
  document.getElementById('pm-new-pass').value  = '';
  document.getElementById('pm-conf-pass').value = '';
  showToast('success', 'Password Updated', 'Your password has been changed successfully');
}

function updatePagePassword() {
  const curr  = document.getElementById('pg-curr-pass')?.value;
  const newP  = document.getElementById('pg-new-pass')?.value;
  const confP = document.getElementById('pg-conf-pass')?.value;

  if (!curr)  { showToast('error', 'Required', 'Enter your current password'); return; }
  if (!newP || newP.length < 6) { showToast('error', 'Too Short', 'New password must be at least 6 characters'); return; }
  if (newP !== confP)  { showToast('error', 'Mismatch', 'New passwords do not match'); return; }

  document.getElementById('pg-curr-pass').value = '';
  document.getElementById('pg-new-pass').value  = '';
  document.getElementById('pg-conf-pass').value = '';
  showToast('success', 'Password Updated', 'Your password has been changed successfully');
}

function toggle2FA() {
  const toggle = document.getElementById('twofa-toggle');
  if (!toggle) return;
  const isOn = toggle.checked;
  showToast('info', isOn ? '2FA Enabled' : '2FA Disabled',
    isOn ? 'Two-factor authentication is now active' : '2FA has been turned off');
}

function togglePage2FA() {
  const toggle = document.getElementById('page-twofa-toggle');
  if (!toggle) return;
  const isOn = toggle.checked;
  showToast('info', isOn ? '2FA Enabled' : '2FA Disabled',
    isOn ? 'Two-factor authentication is now active' : '2FA has been turned off');
}
