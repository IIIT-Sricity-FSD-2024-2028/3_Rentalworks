// ===================================================
//  login.js  (UPDATED)
//  Handles: Role selection, Login for all 5 roles,
//           Guest signup (no admin approval needed),
//           Owner registration (admin approval needed),
//           Session routing
// ===================================================

// ===== STATE =====
let currentRole   = null;
let guestStep     = 1;
let guestFormData = {};

// ===== MOCK DATA FALLBACK =====
if (typeof LOGIN_MOCK === 'undefined') {
  var LOGIN_MOCK = {
    credentials: {
      super_admin: [{ username: 'superadmin', password: 'admin123', name: 'Super Admin', role: 'super_admin' }],
      admin: [{ username: 'admin', password: 'admin123', name: 'Admin', role: 'admin' }],
      warden: [
        { username: 'warden', email: 'sneha.g@email.com', password: 'warden123', name: 'Sneha Gupta', role: 'warden', property: 'Sunrise Heights' }
      ], 
      owner: [
        { username: 'owner1', email: 'rajesh.k@email.com', password: 'owner123', name: 'Rajesh Kumar', role: 'owner', hasActiveSubscription: true, subscriptionPlan: 'Yearly', subscriptionStatus: 'ACTIVE' },
        { username: 'owner2', email: 'priya.p@email.com', password: 'owner123', name: 'Priya Patel', role: 'owner', hasActiveSubscription: true, subscriptionPlan: 'Yearly', subscriptionStatus: 'ACTIVE' },
        { username: 'owner3', email: 'sunita.r@email.com', password: 'owner123', name: 'Sunita Rao', role: 'owner', hasActiveSubscription: false, subscriptionPlan: 'None', subscriptionStatus: 'NONE' }
      ], 
      tenant: [
        { username: 'tenant', email: 'tenant@gmail.com', password: 'password123', name: 'Demo Tenant', property: 'Sunrise PG Residency', room: '201' },
        { username: 'amit', email: 'amit.s@email.com', password: 'password123', name: 'Amit Sharma', property: 'Sunrise PG Residency', room: '101' }
      ], 
      guest: [
        { username: 'guest@gmail.com', email: 'guest@gmail.com', phone: '9876543210', password: 'guest123', name: 'Demo Guest', role: 'guest' },
        { username: 'guest2@gmail.com', email: 'guest2@gmail.com', phone: '9123456789', password: 'guest123', name: 'Rohan Kumar', role: 'guest' }
      ]
    },
    registeredGuests: [
      { id: 101, email: 'guest@gmail.com', phone: '9876543210', password: 'guest123', name: 'Demo Guest', role: 'guest', status: 'active' },
      { id: 102, email: 'guest2@gmail.com', phone: '9123456789', password: 'guest123', name: 'Rohan Kumar', role: 'guest', status: 'active' }
    ],
    registeredOwners: []
  };
}

// Load registered users from localStorage (persisted sign-ups)
let registeredGuests = JSON.parse(localStorage.getItem('registered_guests')) || [...LOGIN_MOCK.registeredGuests];
let registeredOwners = JSON.parse(localStorage.getItem('registered_owners')) || (typeof LOGIN_MOCK !== 'undefined' ? [...LOGIN_MOCK.registeredOwners] : []);

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  showRoleSelector();
});

// ===== BACK BUTTON =====
function goBack() {
  hide('login-card-area');
  hide('guest-signup-area');
  hide('owner-reg-area');
  hide('success-area');
  show('role-selector', 'flex');
  const backBtn = document.getElementById('back-btn');
  if (backBtn) backBtn.style.display = 'none';
  const panel = document.querySelector('.card-panel-inner');
  if (panel) panel.style.maxWidth = '480px';
  currentRole = null;
  guestStep   = 1;
  clearLoginErrors();
  clearRegErrors();
}

// ===== ROLE SELECTOR =====
function showRoleSelector() {
  hide('login-card-area');
  hide('guest-signup-area');
  hide('owner-reg-area');
  hide('success-area');
  show('role-selector', 'flex');
  const backBtn = document.getElementById('back-btn');
  if (backBtn) backBtn.style.display = 'none';
  const panel = document.querySelector('.card-panel-inner');
  if (panel) panel.style.maxWidth = '480px';
}

function selectRole(role) {
  currentRole = role;
  hide('role-selector');
  document.getElementById('back-btn').style.display = 'flex';

  if (role === 'guest') {
    showGuestLogin();
  } else {
    showLoginForm(role);
  }
}

// ===== LOGIN FORM =====
function showLoginForm(role) {
  hide('guest-signup-area');
  hide('owner-reg-area');
  show('login-card-area', 'block');

  // Role-specific title and subtitle
  const titles = {
    super_admin: 'Super Admin Login',
    admin:  'Admin Login',
    warden: 'Warden Login',
    owner:  'Owner Login',
    tenant: 'Tenant Login'
  };
  const subs = {
    super_admin: 'Global system administration access',
    admin:  'System administration access',
    warden: 'PG operations management',
    owner:  'Property owner portal',
    tenant: 'Resident account access'
  };

  const titleEl = document.getElementById('login-role-title');
  const subEl   = document.getElementById('login-role-sub');
  if (titleEl) titleEl.textContent = titles[role] || 'Login';
  if (subEl)   subEl.textContent   = subs[role]   || 'Enter your credentials to continue';

  // Demo Credentials Box
  const demoCreds = {
    super_admin: { u: 'superadmin', p: 'admin123' },
    admin:       { u: 'admin', p: 'admin123' },
    warden:      { u: 'warden', p: 'warden123' },
    owner:       { u: 'owner1', p: 'owner123' },
    tenant:      { u: 'tenant', p: 'password123' }
  };

  const credBox = document.getElementById('demo-creds-box');
  const credVal = document.getElementById('demo-creds-val');
  if (credBox && credVal && demoCreds[role]) {
    credBox.style.display = 'flex';
    credVal.textContent = `${demoCreds[role].u} / ${demoCreds[role].p}`;
    window._currentDemoCreds = demoCreds[role];
  } else if (credBox) {
    credBox.style.display = 'none';
  }

  // Username label — only guest uses email
  const label = document.getElementById('username-label');
  if (label) label.textContent = 'Username or Email';

  // Show only the correct footer — all others hidden
  document.getElementById('guest-footer').style.display        = 'none';
  document.getElementById('owner-register-link').style.display = role === 'owner' ? 'block' : 'none';

  clearLoginErrors();

  const form = document.getElementById('main-login-form');
  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      handleLogin(role);
    };
  }
}

function fillDemoCreds() {
  if (window._currentDemoCreds) {
    const uInput = document.getElementById('login-username');
    const pInput = document.getElementById('login-password');
    if (uInput) uInput.value = window._currentDemoCreds.u;
    if (pInput) pInput.value = window._currentDemoCreds.p;
  }
}

async function handleLogin(role) {
  const usernameInput = document.getElementById('login-username');
  const passwordInput = document.getElementById('login-password');

  const username = usernameInput?.value.trim();
  const password = passwordInput?.value;

  clearLoginErrors();
  let valid = true;

  const usernameLabel = role === 'guest' ? 'Email / Phone' : 'Username';

  if (!username) {
    showErr('err-username', `${usernameLabel} is required`);
    usernameInput?.classList.add('input-error');
    valid = false;
  }
  if (!password) {
    showErr('err-password', 'Password is required');
    passwordInput?.classList.add('input-error');
    valid = false;
  } else if (password.length < 6) {
    showErr('err-password', 'Password must be at least 6 characters');
    passwordInput?.classList.add('input-error');
    valid = false;
  }
  if (!valid) return;

  const submitBtn = document.querySelector('.btn-login');
  if (submitBtn) {
    submitBtn.textContent = 'Logging in...';
    submitBtn.disabled = true;
  }

  let user = null;

  try {
    // 1. Primary: Authenticate with NestJS Backend API (supports both username and email)
    const response = await fetch('http://localhost:3000/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    if (response.ok) {
      user = await response.json();
    } else {
      // 2. Fallback: Check registered users in localStorage or mock credentials
      let registeredMatch = null;
      if (role === 'guest') {
        registeredMatch = registeredGuests.find(
          g => (g.email === username || g.phone === username || g.username === username) && g.password === password
        );
      } else if (role === 'owner') {
        registeredMatch = registeredOwners.find(
          o => (o.username === username || o.email === username || o.phone === username) && o.password === password
        );
      }

      let match = null;
      if (typeof LOGIN_MOCK !== 'undefined' && LOGIN_MOCK.credentials[role]) {
        const credList = LOGIN_MOCK.credentials[role] || [];
        match = credList.find(c => (c.username === username || c.email === username || c.phone === username) && c.password === password);
      }

      user = match || registeredMatch;
    }
  } catch (error) {
    console.error('Login network error, using local fallback:', error);
    // Offline local fallback
    let registeredMatch = null;
    if (role === 'guest') {
      registeredMatch = registeredGuests.find(
        g => (g.email === username || g.phone === username || g.username === username) && g.password === password
      );
    } else if (role === 'owner') {
      registeredMatch = registeredOwners.find(
        o => (o.username === username || o.email === username || o.phone === username) && o.password === password
      );
    }
    user = registeredMatch;
  } finally {
    if (submitBtn) {
      submitBtn.textContent = 'Sign In';
      submitBtn.disabled = false;
    }
  }

  if (user) {
    // Save session with persistent subscription details
    const hasActiveSub = user.hasActiveSubscription !== undefined 
      ? user.hasActiveSubscription 
      : (Boolean(user.subscriptionPlan) && user.subscriptionPlan !== 'Expired' && user.subscriptionPlan !== 'None' && user.subscriptionPlan !== '');

    const subStatus = user.subscriptionStatus || (hasActiveSub ? 'ACTIVE' : (user.subscriptionPlan === 'Expired' ? 'EXPIRED' : 'NONE'));

    sessionStorage.setItem('pg_user', JSON.stringify({
      id:                    user.id,
      name:                  user.name,
      username:              user.username || username,
      email:                 user.email || (username.includes('@') ? username : ''),
      phone:                 user.phone || '',
      role:                  user.role || role,
      property:              user.property || user.propertyName || '',
      room:                  user.room     || '',
      subscriptionPlan:      user.subscriptionPlan || (hasActiveSub ? 'Standard' : ''),
      subscriptionStatus:    subStatus,
      hasActiveSubscription: hasActiveSub,
      subscriptionFee:       user.subscriptionFee || 0,
      subscriptionEndDate:   user.subscriptionEndDate || null
    }));

    const formattedRole = role.charAt(0).toUpperCase() + role.slice(1);
    showLoginBanner(`Directing ${user.name} to ${formattedRole} page...`, 'success');

    setTimeout(() => routeUser(role, user, hasActiveSub, subStatus), 800);

  } else {
    showLoginBanner('Invalid credentials. Please check your username/email and password.', 'error');
  }
}

function routeUser(role, userObj = null, hasActiveSub = false, subStatus = 'NONE') {
  if (role === 'owner') {
    // If owner has an active subscription -> directly to owner dashboard
    if (hasActiveSub) {
      window.location.href = '../../owner/owner_s/index.html';
      return;
    }
    // If expired -> go to subscription page with expired notice
    if (subStatus === 'EXPIRED') {
      window.location.href = '../../owner/owner_s/subscription.html?reason=expired';
      return;
    }
    // If new owner without subscription -> mandatory subscription
    window.location.href = '../../owner/owner_s/subscription.html?reason=required';
    return;
  }

  const routes = {
    admin:  '../../admin/admin/index.html',
    super_admin: '../../super_admin/super_admin/index.html',
    warden: '../../warden/warden/index_warden.html',
    owner:  '../../owner/owner_s/index.html',
    tenant: '../../Tenant/index.html',
    guest:  '../../pg_details/index.html'
  };
  const dest = routes[role];
  if (dest) window.location.href = dest;
}

// ===== GUEST LOGIN =====
function showGuestLogin() {
  hide('owner-reg-area');
  hide('guest-signup-area');
  show('login-card-area', 'block');

  const titleEl = document.getElementById('login-role-title');
  const subEl   = document.getElementById('login-role-sub');
  if (titleEl) titleEl.textContent = 'Guest Login';
  if (subEl)   subEl.textContent   = 'Browse and book PG accommodations';

  // Change label to Email / Phone
  const label = document.getElementById('username-label');
  if (label) label.textContent = 'Email / Phone No';

  // Show only the guest signup footer
  document.getElementById('owner-register-link').style.display = 'none';
  document.getElementById('guest-footer').style.display        = 'block';

  clearLoginErrors();

  const form = document.getElementById('main-login-form');
  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      handleLogin('guest');
    };
  }
}

// ===== GUEST SIGNUP (3-step) =====
function showGuestSignup() {
  hide('login-card-area');
  hide('owner-reg-area');
  show('guest-signup-area', 'flex');
  document.querySelector('.card-panel-inner').style.maxWidth = '950px';
  guestStep     = 1;
  guestFormData = {};
  renderGuestStep();
}

function renderGuestStep() {
  const title    = document.getElementById('signup-title');
  const subtitle = document.getElementById('signup-subtitle');
  const body     = document.getElementById('signup-body');
  const steps    = document.querySelectorAll('.step-item');

  steps.forEach((s, i) => {
    s.classList.toggle('active', i + 1 === guestStep);
    s.classList.toggle('done',   i + 1 < guestStep);
  });

  if (guestStep === 1) {
    if (title)    title.textContent    = 'Personal Information';
    if (subtitle) subtitle.textContent = 'Step 1 of 3';
    body.innerHTML = `
      <div class="step-animated">
        <div style="text-align:center; margin-bottom: 28px;">
           <div style="font-size: 42px; margin-bottom:12px; filter: drop-shadow(0 4px 6px rgba(59, 130, 246, 0.2));">👋</div>
           <h3 style="font-size: 20px; font-weight:800; color:var(--text); margin-bottom:8px;">Welcome! Let's get to know you</h3>
           <p style="color:var(--muted); font-size:14px; line-height:1.5; padding: 0 10px;">Please provide your basic details so we can set up your profile.</p>
        </div>
        <div class="owner-reg-grid" style="gap: 20px; margin-bottom: 24px;">
          <div class="reg-field full" style="margin-bottom: 0;">
            <label>Full Name *</label>
            <div class="reg-inp-wrap">
              <span class="reg-ico">👤</span>
              <input type="text" id="g-name" placeholder="Enter your full name" value="${guestFormData.name || ''}"/>
            </div>
            <div class="reg-err" id="err-g-name"></div>
          </div>
          <div class="reg-field" style="margin-bottom: 0;">
            <label>Email Address *</label>
            <div class="reg-inp-wrap">
              <span class="reg-ico">✉️</span>
              <input type="email" id="g-email" placeholder="your.email@example.com" value="${guestFormData.email || ''}"/>
            </div>
            <div class="reg-err" id="err-g-email"></div>
          </div>
          <div class="reg-field" style="margin-bottom: 0;">
            <label>Phone Number *</label>
            <div class="reg-inp-wrap">
              <span class="reg-ico">📞</span>
              <input type="tel" id="g-phone" placeholder="+91 98765 43210" value="${guestFormData.phone || ''}"/>
            </div>
            <div class="reg-err" id="err-g-phone"></div>
          </div>
        </div>
        <div class="reg-actions">
          <button class="btn-next" onclick="guestNext()">Next Step →</button>
        </div>
        <p class="reg-login-link">Already have an account? <a href="#" onclick="showGuestLogin()">Sign in</a></p>
      </div>
    `;

  } else if (guestStep === 2) {
    if (title)    title.textContent    = 'Address Details';
    if (subtitle) subtitle.textContent = 'Step 2 of 3';
    body.innerHTML = `
      <div class="step-animated">
        <div style="text-align:center; margin-bottom: 28px;">
           <div style="font-size: 42px; margin-bottom:12px; filter: drop-shadow(0 4px 6px rgba(245, 158, 11, 0.2));">🌍</div>
           <h3 style="font-size: 20px; font-weight:800; color:var(--text); margin-bottom:8px;">Where are you from?</h3>
           <p style="color:var(--muted); font-size:14px; line-height:1.5; padding: 0 10px;">Help us tailor your experience by providing your location details.</p>
        </div>
        <div class="owner-reg-grid" style="gap: 20px; margin-bottom: 24px;">
          <div class="reg-field" style="margin-bottom: 0;">
            <label>Date of Birth *</label>
            <div class="reg-inp-wrap">
              <span class="reg-ico">📅</span>
              <input type="date" id="g-dob" value="${guestFormData.dob || ''}"/>
            </div>
            <div class="reg-err" id="err-g-dob"></div>
          </div>
          <div class="reg-field" style="margin-bottom: 0;">
            <label>City *</label>
            <div class="reg-inp-wrap">
              <span class="reg-ico">🏙️</span>
              <input type="text" id="g-city" placeholder="Enter your city" value="${guestFormData.city || ''}"/>
            </div>
            <div class="reg-err" id="err-g-city"></div>
          </div>
          <div class="reg-field full" style="margin-bottom: 0;">
            <label>Current Address *</label>
            <div class="reg-inp-wrap">
              <span class="reg-ico">📍</span>
              <textarea id="g-address" placeholder="Enter your current address" rows="2">${guestFormData.address || ''}</textarea>
            </div>
            <div class="reg-err" id="err-g-address"></div>
          </div>
        </div>
        <div class="reg-actions two-btn">
          <button class="btn-prev" onclick="guestPrev()">← Previous</button>
          <button class="btn-next flex-1" onclick="guestNext()">Next Step →</button>
        </div>
        <p class="reg-login-link">Already have an account? <a href="#" onclick="showGuestLogin()">Sign in</a></p>
      </div>
    `;

  } else if (guestStep === 3) {
    if (title)    title.textContent    = 'Secure Your Account';
    if (subtitle) subtitle.textContent = 'Step 3 of 3';
    body.innerHTML = `
      <div class="step-animated">
        <div style="text-align:center; margin-bottom: 28px;">
           <div style="font-size: 42px; margin-bottom:12px; filter: drop-shadow(0 4px 6px rgba(16, 185, 129, 0.2));">🛡️</div>
           <p style="color:var(--muted); font-size:14px; line-height:1.5; padding: 0 10px;">Create a strong password to protect your bookings and personal information.</p>
        </div>
        <div class="reg-field">
          <label>Password *</label>
          <div class="reg-inp-wrap">
            <span class="reg-ico">🔒</span>
            <input type="password" id="g-password" placeholder="Create a strong password" oninput="checkPwStrength(this.value)"/>
            <span class="toggle-reg-pw" onclick="togglePw('g-password', this)">👁️</span>
          </div>
          <div class="pw-strength-bar" style="height:4px; background:#e2e8f0; margin-top:8px; border-radius:2px; overflow:hidden;">
              <div id="pw-fill" style="height:100%; width:0%; transition:all 0.3s; background:var(--red);"></div>
          </div>
          <small id="pw-hint" style="color:var(--muted);font-size:12px;margin-top:5px;display:block">Use at least 8 characters with letters and numbers</small>
          <div class="reg-err" id="err-g-password"></div>
        </div>
        <div class="reg-field">
          <label>Confirm Password *</label>
          <div class="reg-inp-wrap">
            <span class="reg-ico">🔒</span>
            <input type="password" id="g-confirm" placeholder="Re-enter your password"/>
            <span class="toggle-reg-pw" onclick="togglePw('g-confirm', this)">👁️</span>
          </div>
          <div class="reg-err" id="err-g-confirm"></div>
        </div>
        <div class="reg-actions two-btn">
          <button class="btn-prev" onclick="guestPrev()">← Previous</button>
          <button class="btn-next flex-1" onclick="submitGuestRegistration()">Create Account</button>
        </div>
      </div>
    `;
  }
}

function guestNext() {
  clearRegErrors();

  if (guestStep === 1) {
    const name  = document.getElementById('g-name')?.value.trim();
    const email = document.getElementById('g-email')?.value.trim();
    const phone = document.getElementById('g-phone')?.value.trim();
    let valid = true;

    if (!name)  { showRegErr('err-g-name',  'Full name is required'); valid = false; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showRegErr('err-g-email', 'Enter a valid email address'); valid = false;
    }
    if (!phone || !/^\+?[\d\s\-]{9,}$/.test(phone)) {
      showRegErr('err-g-phone', 'Enter a valid phone number (min 9 digits)'); valid = false;
    }
    // Duplicate email/phone check
    if (valid) {
      const emailTaken = registeredGuests.find(g => g.email === email) ||
        LOGIN_MOCK.credentials.guest?.find(g => g.email === email);
      const phoneTaken = registeredGuests.find(g => g.phone === phone);
      if (emailTaken) { showRegErr('err-g-email', 'An account with this email already exists'); valid = false; }
      if (phoneTaken) { showRegErr('err-g-phone', 'This phone number is already registered'); valid = false; }
    }
    if (!valid) return;

    guestFormData.name  = name;
    guestFormData.email = email;
    guestFormData.phone = phone;

  } else if (guestStep === 2) {
    const dob     = document.getElementById('g-dob')?.value;
    const address = document.getElementById('g-address')?.value.trim();
    const city    = document.getElementById('g-city')?.value.trim();
    let valid = true;

    if (!dob)     { showRegErr('err-g-dob',     'Date of birth is required'); valid = false; }
    if (!address) { showRegErr('err-g-address', 'Address is required');       valid = false; }
    if (!city)    { showRegErr('err-g-city',    'City is required');          valid = false; }
    if (!valid) return;

    guestFormData.dob     = dob;
    guestFormData.address = address;
    guestFormData.city    = city;
  }

  guestStep++;
  renderGuestStep();
}

function guestPrev() {
  guestStep--;
  renderGuestStep();
}

function submitGuestRegistration() {
  clearRegErrors();
  const password = document.getElementById('g-password')?.value;
  const confirm  = document.getElementById('g-confirm')?.value;
  let valid = true;

  if (!password || password.length < 8) {
    showRegErr('err-g-password', 'Password must be at least 8 characters'); valid = false;
  }
  if (password && confirm && password !== confirm) {
    showRegErr('err-g-confirm', 'Passwords do not match'); valid = false;
  } else if (password && !confirm) {
    showRegErr('err-g-confirm', 'Please confirm your password'); valid = false;
  }
  
  if (!valid) return;

  // Check if email already exists
  const emailExists =
    registeredGuests.find(g => g.email === guestFormData.email) ||
    (typeof LOGIN_MOCK !== 'undefined' && LOGIN_MOCK.credentials.guest?.find(g => g.email === guestFormData.email));
  if (emailExists) {
    showRegErr('err-g-password', 'An account with this email already exists');
    return;
  }

  const newGuest = {
    id:           Date.now(),
    name:         guestFormData.name,
    email:        guestFormData.email,
    phone:        guestFormData.phone,
    dob:          guestFormData.dob,
    address:      guestFormData.address,
    city:         guestFormData.city,
    password:     password,
    role:         'guest',
    status:       'active',          // ← No admin approval needed for guests
    registeredOn: new Date().toISOString().split('T')[0]
  };

  registeredGuests.push(newGuest);
  localStorage.setItem('registered_guests', JSON.stringify(registeredGuests));

  // Save session and go straight to booking/guest page
  sessionStorage.setItem('pg_user', JSON.stringify({
    name:  newGuest.name,
    email: newGuest.email,
    phone: newGuest.phone,
    role:  'guest'
  }));

  // Show success then redirect to guest booking page
  showSuccessScreen(
    'Account Created! 🎉',
    `Welcome to RentBro, ${newGuest.name}! Your account has been set up securely.`,
    true
  );
  setTimeout(() => routeUser('guest'), 2800);
}

// ===== OWNER REGISTRATION =====
function showOwnerRegistration() {
  hide('login-card-area');
  hide('guest-signup-area');
  show('owner-reg-area', 'block');
  document.querySelector('.card-panel-inner').style.maxWidth = '800px';
  renderOwnerRegForm();
}

function renderOwnerRegForm() {
  const body = document.getElementById('owner-reg-body');
  if (!body) return;

  body.innerHTML = `
    <div class="owner-reg-grid">
      <div class="reg-field">
        <label>Full Name *</label>
        <div class="reg-inp-wrap">
          <span class="reg-ico">👤</span>
          <input type="text" id="o-name" placeholder="Enter your full name"/>
        </div>
        <div class="reg-err" id="err-o-name"></div>
      </div>
      <div class="reg-field">
        <label>Username *</label>
        <div class="reg-inp-wrap">
          <span class="reg-ico">🏷️</span>
          <input type="text" id="o-username" placeholder="Choose a username"/>
        </div>
        <div class="reg-err" id="err-o-username"></div>
      </div>
      <div class="reg-field">
        <label>Email Address *</label>
        <div class="reg-inp-wrap">
          <span class="reg-ico">✉️</span>
          <input type="email" id="o-email" placeholder="Enter your email"/>
        </div>
        <div class="reg-err" id="err-o-email"></div>
      </div>
      <div class="reg-field">
        <label>Phone Number *</label>
        <div class="reg-inp-wrap">
          <span class="reg-ico">📞</span>
          <input type="tel" id="o-phone" placeholder="Enter your phone number"/>
        </div>
        <div class="reg-err" id="err-o-phone"></div>
      </div>
      <div class="reg-field">
        <label>Account Password *</label>
        <div class="reg-inp-wrap">
          <span class="reg-ico">🔒</span>
          <input type="password" id="o-password" placeholder="Create password (min 6 chars)"/>
          <span class="toggle-reg-pw" onclick="togglePw('o-password', this)">👁️</span>
        </div>
        <div class="reg-err" id="err-o-password"></div>
      </div>
      <div class="reg-field">
        <label>Confirm Password *</label>
        <div class="reg-inp-wrap">
          <span class="reg-ico">🔒</span>
          <input type="password" id="o-confirm" placeholder="Confirm password"/>
          <span class="toggle-reg-pw" onclick="togglePw('o-confirm', this)">👁️</span>
        </div>
        <div class="reg-err" id="err-o-confirm"></div>
      </div>

      <div class="reg-field full">
        <label>PG Property Name *</label>
        <div class="reg-inp-wrap">
          <span class="reg-ico">🏢</span>
          <input type="text" id="o-propname" placeholder="Enter PG property name"/>
        </div>
        <div class="reg-err" id="err-o-propname"></div>
      </div>
      <div class="reg-field full">
        <label>Property Address *</label>
        <div class="reg-inp-wrap">
          <span class="reg-ico">📍</span>
          <input type="text" id="o-propaddr" placeholder="Enter complete property address"/>
        </div>
        <div class="reg-err" id="err-o-propaddr"></div>
      </div>
      <div class="reg-field">
        <label>City *</label>
        <div class="reg-inp-wrap">
          <span class="reg-ico">🏙️</span>
          <input type="text" id="o-city" placeholder="City"/>
        </div>
        <div class="reg-err" id="err-o-city"></div>
      </div>
      <div class="reg-field">
        <label>State *</label>
        <div class="reg-inp-wrap">
          <span class="reg-ico">🗺️</span>
          <input type="text" id="o-state" placeholder="State"/>
        </div>
        <div class="reg-err" id="err-o-state"></div>
      </div>
      <div class="reg-field">
        <label>Total Rooms *</label>
        <div class="reg-inp-wrap">
          <span class="reg-ico">🏠</span>
          <input type="number" id="o-rooms" placeholder="e.g. 10" min="1"/>
        </div>
        <div class="reg-err" id="err-o-rooms"></div>
      </div>
      <div class="reg-field">
        <label>Total Capacity (Beds) *</label>
        <div class="reg-inp-wrap">
          <span class="reg-ico">👥</span>
          <input type="number" id="o-capacity" placeholder="e.g. 20" min="1"/>
        </div>
        <div class="reg-err" id="err-o-capacity"></div>
      </div>
      <div class="reg-field full">
        <label>Amenities</label>
        <div class="amenities-grid">
          <label class="amenity-check"><input type="checkbox" value="WiFi" checked/> WiFi</label>
          <label class="amenity-check"><input type="checkbox" value="AC" checked/> AC</label>
          <label class="amenity-check"><input type="checkbox" value="Parking"/> Parking</label>
          <label class="amenity-check"><input type="checkbox" value="Gym"/> Gym</label>
          <label class="amenity-check"><input type="checkbox" value="Laundry"/> Laundry</label>
          <label class="amenity-check"><input type="checkbox" value="Food"/> Food</label>
        </div>
      </div>
    </div>

    <!-- Documentation Section -->
    <div class="reg-field full doc-section">
      <h4 class="doc-title">📄 Property Verification & Subscription Notice</h4>
      <p class="doc-note">After registering, you will choose an owner subscription plan (Monthly ₹499, Yearly ₹4,999, or Lifetime ₹14,999) to activate and manage your listings.</p>
    </div>

    <div class="reg-field full" style="margin-top:8px">
      <label class="amenity-check commission-check">
        <input type="checkbox" id="o-commission" checked/>
        I agree to RentBro terms of service and property management policies.
      </label>
      <div class="reg-err" id="err-o-commission"></div>
    </div>

    <button class="btn-submit-reg" id="btn-owner-submit" onclick="submitOwnerRegistration()">Create Owner Account & Continue →</button>
    <p class="reg-login-link" style="margin-top:16px">
      Already have an account? <a href="#" onclick="goBack()">Sign in here</a>
    </p>
  `;
}

async function submitOwnerRegistration() {
  const name     = document.getElementById('o-name')?.value.trim();
  const username = document.getElementById('o-username')?.value.trim();
  const email    = document.getElementById('o-email')?.value.trim();
  const phone    = document.getElementById('o-phone')?.value.trim();
  const password = document.getElementById('o-password')?.value;
  const confirm  = document.getElementById('o-confirm')?.value;
  const propname = document.getElementById('o-propname')?.value.trim();
  const propaddr = document.getElementById('o-propaddr')?.value.trim();
  const city     = document.getElementById('o-city')?.value.trim();
  const state    = document.getElementById('o-state')?.value.trim();
  const rooms    = parseInt(document.getElementById('o-rooms')?.value);
  const capacity = parseInt(document.getElementById('o-capacity')?.value);
  const commission = document.getElementById('o-commission')?.checked;

  clearRegErrors();
  let valid = true;

  if (!name) { showRegErr('err-o-name', 'Full name is required'); valid = false; }
  if (!username) { showRegErr('err-o-username', 'Username is required'); valid = false; }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showRegErr('err-o-email', 'Enter a valid email address'); valid = false;
  }
  if (!phone || !/^\+?[\d\s\-]{9,}$/.test(phone)) {
    showRegErr('err-o-phone', 'Enter a valid phone number'); valid = false;
  }
  if (!password || password.length < 6) {
    showRegErr('err-o-password', 'Password must be at least 6 characters'); valid = false;
  }
  if (password !== confirm) {
    showRegErr('err-o-confirm', 'Passwords do not match'); valid = false;
  }
  if (!propname) { showRegErr('err-o-propname', 'Property name is required'); valid = false; }
  if (!propaddr) { showRegErr('err-o-propaddr', 'Property address is required'); valid = false; }
  if (!city)     { showRegErr('err-o-city', 'City is required'); valid = false; }
  if (!state)    { showRegErr('err-o-state', 'State is required'); valid = false; }
  if (isNaN(rooms) || rooms < 1) { showRegErr('err-o-rooms', 'Enter valid room count'); valid = false; }
  if (isNaN(capacity) || capacity < 1) { showRegErr('err-o-capacity', 'Enter valid capacity'); valid = false; }
  if (!commission) { showRegErr('err-o-commission', 'You must agree to the terms'); valid = false; }

  if (!valid) return;

  const submitBtn = document.getElementById('btn-owner-submit');
  if (submitBtn) {
    submitBtn.textContent = 'Registering Account...';
    submitBtn.disabled = true;
  }

  const amenities = [...document.querySelectorAll('.amenity-check input[type=checkbox]:checked')]
    .map(c => c.value).filter(v => v !== 'on');

  let ownerId = Date.now();
  let createdUser = null;

  // Try creating user in NestJS backend
  try {
    const regRes = await fetch('http://localhost:3000/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        username,
        email,
        phone,
        password,
        role: 'owner'
      })
    });
    if (regRes.ok) {
      createdUser = await regRes.json();
      ownerId = createdUser.id;
    }
  } catch (err) {
    console.warn('Backend user creation error (using local state fallback):', err);
  }

  const newOwner = {
    id:               ownerId,
    name,
    username,
    email,
    phone,
    password,
    propertyName:     propname,
    propertyAddress:  propaddr,
    city,
    state,
    totalRooms:       rooms,
    totalCapacity:    capacity,
    amenities,
    role:             'owner',
    status:           'active',
    subscriptionPlan: 'None',
    subscriptionStatus: 'NONE',
    hasActiveSubscription: false,
    registeredOn:     new Date().toISOString().split('T')[0]
  };

  registeredOwners.push(newOwner);
  localStorage.setItem('registered_owners', JSON.stringify(registeredOwners));

  // Save session with mandatory subscription required
  sessionStorage.setItem('pg_user', JSON.stringify({
    id:                    ownerId,
    name:                  name,
    username:              username,
    email:                 email,
    phone:                 phone,
    role:                  'owner',
    property:              propname,
    room:                  '',
    subscriptionPlan:      '',
    subscriptionStatus:    'NONE',
    hasActiveSubscription: false,
    subscriptionFee:       0,
    subscriptionEndDate:   null
  }));

  // Store property details for creation after subscription
  localStorage.setItem(`owner_pending_prop_${ownerId}`, JSON.stringify({
    name: propname,
    location: `${propaddr}, ${city}, ${state}`,
    ownerId: ownerId,
    rentMin: 5000,
    rentMax: 12000,
    rooms: `${rooms}/${capacity}`,
    amenities: amenities
  }));

  showSuccessScreen(
    'Owner Account Created! 🎉',
    `Welcome, ${name}! Your owner account has been registered. Please select a subscription plan to activate your property listing.`,
    true,
    '../../owner/owner_s/subscription.html?reason=required'
  );

  setTimeout(() => {
    window.location.href = '../../owner/owner_s/subscription.html?reason=required';
  }, 2200);
}

// ===== SUCCESS SCREEN =====
function showSuccessScreen(title, message, isRedirect = false, redirectUrl = null) {
  hide('login-card-area');
  hide('guest-signup-area');
  hide('owner-reg-area');
  hide('role-selector');
  show('success-area', 'flex');
  const panel = document.querySelector('.card-panel-inner');
  if (panel) panel.style.maxWidth = '480px';
  
  // Re-trigger CSS animation
  const card = document.getElementById('success-area');
  if (card) {
    card.classList.remove('show-animated');
    void card.offsetWidth; // trigger reflow
    card.classList.add('show-animated');
  }

  const titleEl = document.getElementById('success-title');
  const msgEl = document.getElementById('success-message');
  const backBtn = document.getElementById('back-btn');
  const successBtn = document.getElementById('success-btn');
  const redirectLoader = document.getElementById('redirect-loader');

  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.textContent = message;
  if (backBtn) backBtn.style.display = 'none';

  if (isRedirect) {
    if (successBtn) {
      successBtn.style.display = 'block';
      successBtn.textContent = 'Proceed Now →';
      successBtn.onclick = () => {
        if (redirectUrl) window.location.href = redirectUrl;
        else goBack();
      };
    }
    if (redirectLoader) redirectLoader.style.display = 'flex';
  } else {
    if (successBtn) {
      successBtn.style.display = 'block';
      successBtn.textContent = 'Return to Login';
      successBtn.onclick = () => goBack();
    }
    if (redirectLoader) redirectLoader.style.display = 'none';
  }
}

// ===== UTILS =====
function show(id, display = 'block') {
  const el = document.getElementById(id);
  if (el) el.style.display = display;
}

function hide(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

function showErr(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function showRegErr(id, msg) {
  const el = document.getElementById(id);
  if (el) { 
    el.textContent = msg; 
    el.style.display = 'block'; 
    const inputId = id.replace('err-', '');
    const inputEl = document.getElementById(inputId);
    if (inputEl) inputEl.classList.add('input-error');
  }
}

function clearLoginErrors() {
  document.querySelectorAll('.login-err-msg').forEach(e => e.textContent = '');
  document.querySelectorAll('.input-error').forEach(e => e.classList.remove('input-error'));
  const banner = document.getElementById('login-banner');
  if (banner) { banner.style.display = 'none'; banner.className = 'login-banner'; }
}

function clearRegErrors() {
  document.querySelectorAll('.reg-err').forEach(e => {
    e.textContent = '';
    e.style.display = 'none';
  });
  document.querySelectorAll('.input-error').forEach(e => e.classList.remove('input-error'));
}

function checkPwStrength(val) {
  const fill = document.getElementById('pw-fill');
  const hint = document.getElementById('pw-hint');
  if (!fill || !hint) return;
  
  let strength = 0;
  if (val.length >= 8) strength++;
  if (/[A-Z]/.test(val) && /[a-z]/.test(val)) strength++;
  if (/\d/.test(val)) strength++;
  if (/[^A-Za-z0-9]/.test(val)) strength++;
  
  if (val.length === 0) {
    fill.style.width = '0%';
    hint.textContent = 'Use at least 8 characters with letters and numbers';
    hint.style.color = 'var(--muted)';
  } else if (strength <= 1) {
    fill.style.width = '33%';
    fill.style.background = 'var(--red)';
    hint.textContent = 'Weak password';
    hint.style.color = 'var(--red)';
  } else if (strength === 2 || strength === 3) {
    fill.style.width = '66%';
    fill.style.background = '#eab308';
    hint.textContent = 'Medium password';
    hint.style.color = '#ca8a04';
  } else {
    fill.style.width = '100%';
    fill.style.background = 'var(--green)';
    hint.textContent = 'Strong password';
    hint.style.color = 'var(--green)';
  }
}

function showLoginBanner(msg, type) {
  const banner = document.getElementById('login-banner');
  if (!banner) return;
  banner.textContent    = msg;
  banner.className      = `login-banner ${type}`;
  banner.style.display  = 'block';
}

function togglePw(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  inp.type     = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? '👁️' : '🙈';
}