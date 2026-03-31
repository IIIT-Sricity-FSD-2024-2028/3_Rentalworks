// ===================================================
//  profile_warden.js
//  Handles: Render Profile, Save Changes
// ===================================================

function renderProfile() {
  const user = JSON.parse(sessionStorage.getItem('warden_user')) || MOCK_DATA.warden;

  setInner('profile-avatar-letter', user.name[0].toUpperCase());
  setInner('profile-name', user.name);
  setInner('profile-email', user.email);

  const nameInput  = document.getElementById('profile-fullname');
  const emailInput = document.getElementById('profile-email-input');
  const phoneInput = document.getElementById('profile-phone');
  const propInput  = document.getElementById('profile-property');

  if (nameInput)  nameInput.value  = MOCK_DATA.warden.name;
  if (emailInput) emailInput.value = MOCK_DATA.warden.email;
  if (phoneInput) phoneInput.value = MOCK_DATA.warden.phone;
  if (propInput)  propInput.value  = MOCK_DATA.warden.property;
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
  if (!/^\+?[\d\s\-]{10,}$/.test(phone)) {
    showToast('error', 'Invalid Phone', 'Please enter a valid phone number');
    return;
  }

  // Update mock data
  MOCK_DATA.warden.name  = name;
  MOCK_DATA.warden.email = email;
  MOCK_DATA.warden.phone = phone;

  // Update session
  const user = JSON.parse(sessionStorage.getItem('warden_user')) || {};
  user.name  = name;
  user.email = email;
  sessionStorage.setItem('warden_user', JSON.stringify(user));

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
