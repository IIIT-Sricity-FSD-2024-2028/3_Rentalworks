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

// Load registered users from localStorage (persisted sign-ups)
let registeredGuests = JSON.parse(localStorage.getItem('registered_guests')) || [...LOGIN_MOCK.registeredGuests];
let registeredOwners = JSON.parse(localStorage.getItem('registered_owners')) || [...LOGIN_MOCK.registeredOwners];

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  showRoleSelector();
});

// ===== BACK BUTTON =====
function goBack() {
  hide('login-card-area');
  hide('guest-signup-area');
  hide('owner-reg-area');
  show('role-selector', 'flex');
  document.getElementById('back-btn').style.display = 'none';
  currentRole = null;
  guestStep   = 1;
}

// ===== ROLE SELECTOR =====
function showRoleSelector() {
  hide('login-card-area');
  hide('guest-signup-area');
  hide('owner-reg-area');
  hide('success-area');
  show('role-selector', 'flex');
  document.getElementById('back-btn').style.display = 'none';
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
    admin:  'Admin Login',
    warden: 'Warden Login',
    owner:  'Owner Login',
    tenant: 'Tenant Login'
  };
  const subs = {
    admin:  'System administration access',
    warden: 'PG operations management',
    owner:  'Property owner portal',
    tenant: 'Resident account access'
  };

  const titleEl = document.getElementById('login-role-title');
  const subEl   = document.getElementById('login-role-sub');
  if (titleEl) titleEl.textContent = titles[role] || 'Login';
  if (subEl)   subEl.textContent   = subs[role]   || 'Enter your credentials to continue';

  // Username label — only guest uses email
  const label = document.getElementById('username-label');
  if (label) label.textContent = 'Username';

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

function handleLogin(role) {
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

  // Check mock credentials
  const credList = LOGIN_MOCK.credentials[role] || [];
  const match = credList.find(c => (c.username === username || c.email === username) && c.password === password);

  // Also check registered guests/owners in localStorage
  let registeredMatch = null;
  if (role === 'guest') {
    registeredMatch = registeredGuests.find(
      g => (g.email === username || g.phone === username) && g.password === password
    );
  }
  if (role === 'owner') {
    registeredMatch = registeredOwners.find(
      o => o.email === username && o.password === password
    );
  }

  const user = match || registeredMatch;

  if (user) {
    // Only owners need pending check — guests are auto-active
    if (role === 'owner' && user.status === 'pending') {
      showLoginBanner(
        'Your property registration is pending admin verification. You will be notified once approved.',
        'warning'
      );
      return;
    }

    // Save session
    sessionStorage.setItem('pg_user', JSON.stringify({
      name:     user.name,
      email:    user.email,
      role:     role,
      property: user.property || '',
      room:     user.room     || ''
    }));

    showLoginBanner(`Welcome back, ${user.name}! Redirecting...`, 'success');

    setTimeout(() => routeUser(role), 1200);

  } else {
    showLoginBanner('Invalid credentials. Please check and try again.', 'error');
  }
}

function routeUser(role) {
  const routes = {
    admin:  '../../admin/admin/index.html',
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
      <div class="reg-field">
        <label>Full Name *</label>
        <div class="reg-inp-wrap">
          <span class="reg-ico">👤</span>
          <input type="text" id="g-name" placeholder="Enter your full name" value="${guestFormData.name || ''}"/>
        </div>
        <div class="reg-err" id="err-g-name"></div>
      </div>
      <div class="reg-field">
        <label>Email Address *</label>
        <div class="reg-inp-wrap">
          <span class="reg-ico">✉️</span>
          <input type="email" id="g-email" placeholder="your.email@example.com" value="${guestFormData.email || ''}"/>
        </div>
        <div class="reg-err" id="err-g-email"></div>
      </div>
      <div class="reg-field">
        <label>Phone Number *</label>
        <div class="reg-inp-wrap">
          <span class="reg-ico">📞</span>
          <input type="tel" id="g-phone" placeholder="+91 98765 43210" value="${guestFormData.phone || ''}"/>
        </div>
        <div class="reg-err" id="err-g-phone"></div>
      </div>
      <div class="reg-actions">
        <button class="btn-next" onclick="guestNext()">Next Step →</button>
      </div>
      <p class="reg-login-link">Already have an account? <a href="#" onclick="showGuestLogin()">Sign in</a></p>
    `;

  } else if (guestStep === 2) {
    if (title)    title.textContent    = 'Address Details';
    if (subtitle) subtitle.textContent = 'Step 2 of 3';
    body.innerHTML = `
      <div class="reg-field">
        <label>Date of Birth *</label>
        <div class="reg-inp-wrap">
          <span class="reg-ico">📅</span>
          <input type="date" id="g-dob" value="${guestFormData.dob || ''}"/>
        </div>
        <div class="reg-err" id="err-g-dob"></div>
      </div>
      <div class="reg-field">
        <label>Current Address *</label>
        <div class="reg-inp-wrap">
          <span class="reg-ico">📍</span>
          <textarea id="g-address" placeholder="Enter your current address" rows="3">${guestFormData.address || ''}</textarea>
        </div>
        <div class="reg-err" id="err-g-address"></div>
      </div>
      <div class="reg-field">
        <label>City *</label>
        <div class="reg-inp-wrap">
          <span class="reg-ico">🏙️</span>
          <input type="text" id="g-city" placeholder="Enter your city" value="${guestFormData.city || ''}"/>
        </div>
        <div class="reg-err" id="err-g-city"></div>
      </div>
      <div class="reg-actions two-btn">
        <button class="btn-prev" onclick="guestPrev()">← Previous</button>
        <button class="btn-next flex-1" onclick="guestNext()">Next Step →</button>
      </div>
      <p class="reg-login-link">Already have an account? <a href="#" onclick="showGuestLogin()">Sign in</a></p>
    `;

  } else if (guestStep === 3) {
    if (title)    title.textContent    = 'Secure Your Account';
    if (subtitle) subtitle.textContent = 'Step 3 of 3';
    body.innerHTML = `
      <div class="reg-field">
        <label>Password *</label>
        <div class="reg-inp-wrap">
          <span class="reg-ico">🔒</span>
          <input type="password" id="g-password" placeholder="Create a strong password"/>
          <span class="toggle-reg-pw" onclick="togglePw('g-password', this)">👁️</span>
        </div>
        <small style="color:var(--muted);font-size:12px;margin-top:5px;display:block">Use at least 8 characters with letters and numbers</small>
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
      <p class="reg-login-link">Already have an account? <a href="#" onclick="showGuestLogin()">Sign in</a></p>
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
    if (!email || !email.endsWith('@email.com')) {
      showRegErr('err-g-email', 'Email must end with @email.com'); valid = false;
    }
    if (!phone || !/^\+?[\d\s\-]{10,}$/.test(phone)) {
      showRegErr('err-g-phone', 'Enter a valid phone number (min 10 digits)'); valid = false;
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
  if (password !== confirm) {
    showRegErr('err-g-confirm', 'Passwords do not match'); valid = false;
  }
  if (!valid) return;

  // Check if email already exists
  const emailExists =
    registeredGuests.find(g => g.email === guestFormData.email) ||
    LOGIN_MOCK.credentials.guest?.find(g => g.email === guestFormData.email);
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
    role:  'guest'
  }));

  // Redirect straight to guest booking page — no success screen, no waiting
  window.location.href = '../guest/guest.html';
}

// ===== OWNER REGISTRATION =====
function showOwnerRegistration() {
  hide('login-card-area');
  hide('guest-signup-area');
  show('owner-reg-area', 'block');
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
        <label>Total Rooms *</label>
        <div class="reg-inp-wrap">
          <span class="reg-ico">🏠</span>
          <input type="number" id="o-rooms" placeholder="0" min="1"/>
        </div>
        <div class="reg-err" id="err-o-rooms"></div>
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
        <label>Total Capacity *</label>
        <div class="reg-inp-wrap">
          <span class="reg-ico">👥</span>
          <input type="number" id="o-capacity" placeholder="0" min="1"/>
        </div>
        <div class="reg-err" id="err-o-capacity"></div>
      </div>
      <div class="reg-field full">
        <label>Amenities</label>
        <div class="amenities-grid">
          <label class="amenity-check"><input type="checkbox" value="WiFi"/> WiFi</label>
          <label class="amenity-check"><input type="checkbox" value="AC"/> AC</label>
          <label class="amenity-check"><input type="checkbox" value="Parking"/> Parking</label>
          <label class="amenity-check"><input type="checkbox" value="Gym"/> Gym</label>
          <label class="amenity-check"><input type="checkbox" value="Laundry"/> Laundry</label>
          <label class="amenity-check"><input type="checkbox" value="Food"/> Food</label>
        </div>
      </div>
    </div>

    <!-- Documentation Section -->
    <div class="reg-field full doc-section">
      <h4 class="doc-title">📄 Documentation Required for Verification</h4>
      <p class="doc-note">These documents will be reviewed by the admin before your property goes live on the platform.</p>
      <div class="doc-grid">
        <div class="reg-field">
          <label>ID Proof * (Aadhaar / PAN / Driving License)</label>
          <div class="file-inp-wrap">
            <span class="reg-ico">📋</span>
            <input type="file" id="o-idproof" accept=".pdf,.jpg,.jpeg,.png" class="file-input"/>
            <span class="file-label">Choose file...</span>
          </div>
          <div class="reg-err" id="err-o-idproof"></div>
        </div>
        <div class="reg-field">
          <label>Property Images * (Multiple)</label>
          <div class="file-inp-wrap">
            <span class="reg-ico">🖼️</span>
            <input type="file" id="o-images" accept=".jpg,.jpeg,.png" multiple class="file-input"/>
            <span class="file-label">Choose files...</span>
          </div>
          <div class="reg-err" id="err-o-images"></div>
        </div>
        <div class="reg-field">
          <label>Property Ownership Proof</label>
          <div class="file-inp-wrap">
            <span class="reg-ico">🏠</span>
            <input type="file" id="o-ownership" accept=".pdf,.jpg,.jpeg,.png" class="file-input"/>
            <span class="file-label">Choose file...</span>
          </div>
        </div>
        <div class="reg-field">
          <label>Fire Safety Certificate</label>
          <div class="file-inp-wrap">
            <span class="reg-ico">🔥</span>
            <input type="file" id="o-firesafety" accept=".pdf,.jpg,.jpeg,.png" class="file-input"/>
            <span class="file-label">Choose file...</span>
          </div>
        </div>
      </div>
    </div>

    <div class="reg-field full" style="margin-top:8px">
      <label class="amenity-check commission-check">
        <input type="checkbox" id="o-commission"/>
        I agree to the <strong>10% platform commission</strong> on all bookings processed through PG Rental Hub.
      </label>
      <div class="reg-err" id="err-o-commission"></div>
    </div>

    <button class="btn-submit-reg" onclick="submitOwnerRegistration()">Submit for Verification</button>
    <p class="reg-login-link" style="margin-top:16px">
      Already registered? <a href="#" onclick="goBack()">Sign in here</a>
    </p>
  `;

  // File input label updates
  document.querySelectorAll('.file-input').forEach(inp => {
    inp.addEventListener('change', function () {
      const label = this.nextElementSibling;
      if (label) {
        label.textContent = this.files.length > 1
          ? `${this.files.length} files selected`
          : (this.files[0]?.name || 'Choose file...');
      }
    });
  });
}

function submitOwnerRegistration() {
  const name     = document.getElementById('o-name')?.value.trim();
  const email    = document.getElementById('o-email')?.value.trim();
  const phone    = document.getElementById('o-phone')?.value.trim();
  const propname = document.getElementById('o-propname')?.value.trim();
  const propaddr = document.getElementById('o-propaddr')?.value.trim();
  const city     = document.getElementById('o-city')?.value.trim();
  const state    = document.getElementById('o-state')?.value.trim();
  const rooms    = parseInt(document.getElementById('o-rooms')?.value);
  const capacity = parseInt(document.getElementById('o-capacity')?.value);
  const idproof  = document.getElementById('o-idproof')?.files[0];
  const images   = document.getElementById('o-images')?.files;
  const commission = document.getElementById('o-commission')?.checked;

  clearRegErrors();
  let valid = true;

  if (!name)     { showRegErr('err-o-name',     'Full name is required');            valid = false; }
  if (!email || !email.endsWith('@email.com')) {
    showRegErr('err-o-email', 'Email must end with @email.com'); valid = false;
  }
  if (!phone || !/^\+?[\d\s\-]{10,}$/.test(phone)) {
    showRegErr('err-o-phone', 'Enter a valid phone number'); valid = false;
  }
  if (!propname) { showRegErr('err-o-propname', 'Property name is required');        valid = false; }
  if (!propaddr) { showRegErr('err-o-propaddr', 'Property address is required');     valid = false; }
  if (!city)     { showRegErr('err-o-city',     'City is required');                 valid = false; }
  if (!state)    { showRegErr('err-o-state',    'State is required');                valid = false; }
  if (isNaN(rooms) || rooms < 1)    { showRegErr('err-o-rooms',    'Enter a valid room count');   valid = false; }
  if (isNaN(capacity) || capacity < 1) { showRegErr('err-o-capacity', 'Enter a valid capacity'); valid = false; }
  if (!idproof)  { showRegErr('err-o-idproof',  'ID proof document is required');    valid = false; }
  if (!images || images.length === 0) {
    showRegErr('err-o-images', 'At least one property image is required'); valid = false;
  }
  if (!commission) {
    showRegErr('err-o-commission', 'You must agree to the commission terms'); valid = false;
  }
  if (!valid) return;

  const amenities = [...document.querySelectorAll('.amenity-check input[type=checkbox]:checked')]
    .map(c => c.value).filter(v => v !== 'on');

  const newOwner = {
    id:               Date.now(),
    name, email, phone,
    propertyName:     propname,
    propertyAddress:  propaddr,
    city, state,
    totalRooms:       rooms,
    totalCapacity:    capacity,
    amenities,
    idProof:          idproof.name,
    propertyImages:   `${images.length} image(s)`,
    commissionAgreed: true,
    role:             'owner',
    status:           'pending',     // ← Owners DO need admin approval
    registeredOn:     new Date().toISOString().split('T')[0],
    docsVerified:     false,
    inspectionPassed: false
  };

  registeredOwners.push(newOwner);
  localStorage.setItem('registered_owners', JSON.stringify(registeredOwners));

  // Push notification to Admin for real-time verification alert
  let crossNotifs = JSON.parse(localStorage.getItem('cross_notifications') || '[]');
  crossNotifs.push({
    id: Date.now(),
    title: 'New Property Registration',
    message: `Owner ${name} submitted property "${propname}" for verification.`,
    type: 'warning',
    priority: 'urgent',
    targetRole: 'admin',
    by: name,
    sentAt: new Date().toLocaleString()
  });
  localStorage.setItem('cross_notifications', JSON.stringify(crossNotifs));

  showSuccessScreen(
    'Registration Submitted',
    `Thank you, ${name}. Your property "${propname}" has been submitted for admin review. You will be notified once your documents are verified and the property inspection is complete.`
  );
}

// ===== SUCCESS SCREEN =====
function showSuccessScreen(title, message) {
  hide('login-card-area');
  hide('guest-signup-area');
  hide('owner-reg-area');
  hide('role-selector');
  show('success-area', 'flex');
  document.getElementById('success-title').textContent   = title;
  document.getElementById('success-message').textContent = message;
  document.getElementById('back-btn').style.display      = 'none';
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
  if (el) { el.textContent = msg; el.style.display = 'block'; }
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