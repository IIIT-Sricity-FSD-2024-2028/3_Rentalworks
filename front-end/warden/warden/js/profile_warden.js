// ===================================================
//  profile_warden.js
//  Handles: Render Profile, Save Changes
// ===================================================

function renderProfile() {
  const user = JSON.parse(sessionStorage.getItem('pg_user')) || MOCK_DATA.warden;

  // Warden is for Sunrise PG only
  user.property = 'Sunrise PG';

  setInner('profile-avatar-letter', user.name ? user.name[0].toUpperCase() : 'W');
  setInner('profile-name', user.name);
  setInner('profile-email', user.email);

  const nameInput  = document.getElementById('profile-fullname');
  const emailInput = document.getElementById('profile-email-input');
  const phoneInput = document.getElementById('profile-phone');
  const propInput  = document.getElementById('profile-property');

  if (nameInput)  nameInput.value  = user.name || '';
  if (emailInput) emailInput.value = user.email || '';
  if (phoneInput) phoneInput.value = user.phone || '';
  if (propInput) {
    propInput.value  = user.property;
    propInput.disabled = true; // Lock the property field
  }
}

function saveProfile() {
  const name  = document.getElementById('profile-fullname').value.trim();
  const email = document.getElementById('profile-email-input').value.trim();
  const phone = document.getElementById('profile-phone').value.trim();

  // Validation
  if (!name || !email || !phone) {
    showToast('error', 'Validation Error', 'Please fill all required fields');
    return;
  }
  if (!validateEmail(email)) {
    showToast('error', 'Invalid Email', 'Please enter a valid email address');
    return;
  }
  if (!/^\+?[\d\s\-]{9,}$/.test(phone)) {
    showToast('error', 'Invalid Phone', 'Please enter a valid phone number');
    return;
  }

  // Update mock data
  MOCK_DATA.warden.name  = name;
  MOCK_DATA.warden.email = email;
  MOCK_DATA.warden.phone = phone;

  // Update session using the central pg_user key
  const user = JSON.parse(sessionStorage.getItem('pg_user')) || {};
  user.name  = name;
  user.email = email;
  user.phone = phone;
  sessionStorage.setItem('pg_user', JSON.stringify(user));

  // Immediately update left profile card
  setInner('profile-avatar-letter', name[0].toUpperCase());
  setInner('profile-name', name);
  setInner('profile-email', email);

  // Update navbar
  updateNavbarUser(user);

  showToast('success', 'Profile Saved', 'Your profile has been updated');
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
