// ===================================================
//  profile_admin.js
//  Handles: Profile/Settings modal triggered by gear icon
//           Admin details, password change, 2FA, session
// ===================================================

function setupGearIcon() {
  const gear = document.getElementById('gear-btn');
  if (gear) gear.addEventListener('click', openProfileModal);
}

function openProfileModal() {
  const overlay = document.getElementById('profile-modal-overlay');
  if (overlay) overlay.classList.add('show');
}

function closeProfileModal() {
  const overlay = document.getElementById('profile-modal-overlay');
  if (overlay) overlay.classList.remove('show');
}

function updatePassword() {
  const curr  = document.getElementById('pm-curr-pass')?.value;
  const newP  = document.getElementById('pm-new-pass')?.value;
  const confP = document.getElementById('pm-conf-pass')?.value;

  if (!curr)  { showToast('error', 'Required', 'Enter your current password'); return; }
  if (!newP || newP.length < 6) { showToast('error', 'Too Short', 'New password must be at least 6 characters'); return; }
  if (newP !== confP)  { showToast('error', 'Mismatch', 'New passwords do not match'); return; }
  if (curr !== ADMIN_DATA.admin.password) { showToast('error', 'Incorrect', 'Current password is wrong'); return; }

  ADMIN_DATA.admin.password = newP;
  document.getElementById('pm-curr-pass').value = '';
  document.getElementById('pm-new-pass').value  = '';
  document.getElementById('pm-conf-pass').value = '';
  showToast('success', 'Password Updated', 'Your password has been changed successfully');
}

function toggle2FA() {
  const toggle = document.getElementById('twofa-toggle');
  if (!toggle) return;
  const isOn = toggle.checked;
  showToast('info', isOn ? '2FA Enabled' : '2FA Disabled',
    isOn ? 'Two-factor authentication is now active' : '2FA has been turned off');
}
