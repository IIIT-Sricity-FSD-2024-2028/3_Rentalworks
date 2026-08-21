// ===================================================
//  profile_warden.js
//  Handles: Render Profile, Save Changes
// ===================================================

function renderProfile() {
  const user = JSON.parse(sessionStorage.getItem('warden_user')) || MOCK_DATA.warden;

  setInner('profile-avatar-letter', (user.name || 'W')[0].toUpperCase());
  setInner('profile-name', user.name);
  setInner('profile-email', user.email);

  const userInput = document.getElementById('profile-username-input');
  const nameInput  = document.getElementById('profile-fullname');
  const emailInput = document.getElementById('profile-email-input');
  const phoneInput = document.getElementById('profile-phone');
  const propInput  = document.getElementById('profile-property');

  if (userInput)  userInput.value  = user.username || 'warden';
  if (nameInput)  nameInput.value  = user.name || '';
  if (emailInput) emailInput.value = user.email || '';
  if (phoneInput) phoneInput.value = user.phone || '';
  if (propInput)  propInput.value  = user.property || 'Default Property';

  const errEl = document.getElementById('warden-username-err');
  if (errEl) errEl.style.display = 'none';
}

function saveProfile() {
  const username = (document.getElementById('profile-username-input')?.value || '').trim();
  const name  = document.getElementById('profile-fullname').value.trim();
  const email = document.getElementById('profile-email-input').value.trim();
  const phone = document.getElementById('profile-phone').value.trim();
  const errEl = document.getElementById('warden-username-err');

  if (errEl) errEl.style.display = 'none';

  // Validation
  if (!username) {
    if (errEl) { errEl.textContent = 'Username is required'; errEl.style.display = 'block'; }
    showToast('error', 'Validation Error', 'Username is required');
    return;
  }
  if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username)) {
    if (errEl) { errEl.textContent = 'Username must be 3-30 characters long'; errEl.style.display = 'block'; }
    showToast('error', 'Validation Error', 'Username format is invalid');
    return;
  }
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

  // Check unique username
  const accounts = JSON.parse(localStorage.getItem('pg_user_accounts') || '[]');
  const sessionUser = JSON.parse(sessionStorage.getItem('warden_user') || '{}');
  const isTaken = accounts.some(a => 
    a.username.toLowerCase() === username.toLowerCase() && 
    (a.email && a.email.toLowerCase() !== email.toLowerCase())
  );
  if (isTaken) {
    if (errEl) { errEl.textContent = `Username "${username}" is already taken by another account`; errEl.style.display = 'block'; }
    showToast('error', 'Username Taken', `Username "${username}" is already taken!`);
    return;
  }

  // Update mock data
  MOCK_DATA.warden.username = username;
  MOCK_DATA.warden.name  = name;
  MOCK_DATA.warden.email = email;
  MOCK_DATA.warden.phone = phone;

  // Update persistent account store in localStorage
  let updatedAccs = accounts.map(acc => {
    if ((acc.email && acc.email.toLowerCase() === email.toLowerCase()) || acc.role === 'warden') {
      return { ...acc, username, name, email, phone };
    }
    return acc;
  });
  localStorage.setItem('pg_user_accounts', JSON.stringify(updatedAccs));

  // Update session
  const user = JSON.parse(sessionStorage.getItem('warden_user')) || {};
  user.username = username;
  user.name  = name;
  user.email = email;
  user.phone = phone;
  sessionStorage.setItem('warden_user', JSON.stringify(user));
  sessionStorage.setItem('pg_user', JSON.stringify(user));

  // Immediately update left profile card
  setInner('profile-avatar-letter', name[0].toUpperCase());
  setInner('profile-name', name);
  setInner('profile-email', email);

  // Update navbar
  updateNavbarUser(user);

  showToast('success', 'Profile Saved', 'Your profile and username have been updated');
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
