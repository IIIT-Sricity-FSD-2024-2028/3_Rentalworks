import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const API_BASE = 'http://localhost:3000';

const DEMO_CREDENTIALS = {
  super_admin: { username: 'superadmin', password: 'admin123', name: 'Super Admin', role: 'super_admin' },
  admin: { username: 'admin', password: 'password123', name: 'System Admin', role: 'admin' },
  tenant: { username: 'tenant1', password: 'password123', name: 'Arun Kumar', role: 'tenant', property: 'Sunrise PG Residency', room: '102' },
  guest: { username: 'testguest@example.com', password: 'tenant123', name: 'Demo Guest', role: 'guest' },
  owner: { username: 'owner1', password: 'password123', name: 'PG Owner One', role: 'owner', status: 'approved' },
  warden: { username: 'warden', password: 'warden123', name: 'Warden Officer', role: 'warden' },
};

const ROLE_INFO = {
  super_admin: { title: 'Super Admin Login', sub: 'Global system administration access' },
  admin: { title: 'Admin Login', sub: 'System administration access' },
  tenant: { title: 'Tenant Login', sub: 'Resident account access' },
  guest: { title: 'Guest Login', sub: 'Browse and book PG accommodations' },
  owner: { title: 'Owner Login', sub: 'Property owner portal' },
  warden: { title: 'Warden Login', sub: 'PG operations management' },
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  let setTenantSession = null;
  try {
    const auth = useAuth?.();
    if (auth) setTenantSession = auth.setTenantSession;
  } catch (_) {
    // optional if rendered outside tenant AuthProvider
  }

  // View states: 'role_select' | 'login' | 'signup' | 'owner_reg' | 'success'
  const [viewMode, setViewMode] = useState('role_select');
  const [currentRole, setCurrentRole] = useState(null);

  // Login form fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [usernameErr, setUsernameErr] = useState('');
  const [passwordErr, setPasswordErr] = useState('');
  const [banner, setBanner] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  // Guest multi-step signup state
  const [guestStep, setGuestStep] = useState(1);
  const [guestData, setGuestData] = useState({
    name: '',
    email: '',
    phone: '',
    dob: '',
    city: '',
    address: '',
    password: '',
    confirm: '',
  });
  const [guestErr, setGuestErr] = useState({});
  const [pwStrength, setPwStrength] = useState(0);

  // Owner registration state
  const [ownerData, setOwnerData] = useState({
    name: '',
    email: '',
    phone: '',
    rooms: '',
    propname: '',
    propaddr: '',
    city: '',
    state: '',
    capacity: '',
    amenities: ['WiFi', 'Food'],
    idproof: null,
    images: [],
    ownership: null,
    firesafety: null,
    commission: false,
  });
  const [ownerErr, setOwnerErr] = useState({});

  // Success screen state
  const [successInfo, setSuccessInfo] = useState({
    title: 'Success',
    message: 'Operation completed successfully.',
    isRedirect: false,
  });

  // Navigation router connecting to all React portals in front-end-react
  const routeUser = (role) => {
    const routes = {
      tenant: '/tenant/dashboard',
      guest: '/listings',
      warden: '/warden/dashboard',
      owner: '/owner',
      admin: '/admin',
      super_admin: '/super-admin',
    };

    const dest = routes[role] || '/tenant/dashboard';
    navigate(dest);
  };

  // Switch role handler
  const selectRole = (role) => {
    setCurrentRole(role);
    setBanner({ text: '', type: '' });
    setUsernameErr('');
    setPasswordErr('');

    // Pre-fill demo credentials for seamless testing
    const demo = DEMO_CREDENTIALS[role];
    if (demo) {
      setUsername(demo.username);
      setPassword(demo.password);
    } else {
      setUsername('');
      setPassword('');
    }

    setViewMode('login');
  };

  const goBack = () => {
    setViewMode('role_select');
    setCurrentRole(null);
    setBanner({ text: '', type: '' });
    setUsernameErr('');
    setPasswordErr('');
    setGuestStep(1);
  };

  // Handle Login submission
  const handleLogin = async (e) => {
    e.preventDefault();
    setUsernameErr('');
    setPasswordErr('');
    setBanner({ text: '', type: '' });

    let valid = true;
    const label = currentRole === 'guest' ? 'Email / Phone / Username' : 'Username';

    if (!username.trim()) {
      setUsernameErr(`${label} is required`);
      valid = false;
    }
    if (!password) {
      setPasswordErr('Password is required');
      valid = false;
    } else if (password.length < 6) {
      setPasswordErr('Password must be at least 6 characters');
      valid = false;
    }
    if (!valid) return;

    setLoading(true);

    try {
      // 1. Submit login request directly to backend API connected to Neon PostgreSQL
      const res = await fetch(`${API_BASE}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setBanner({ text: errorData.message || 'Invalid username or password. Please try again.', type: 'error' });
        setLoading(false);
        return;
      }

      const user = await res.json();

      // Check Owner approval status
      if (user.role === 'owner' && user.status === 'pending') {
        setBanner({
          text: 'Your property registration is pending admin verification. You will be notified once approved.',
          type: 'warning',
        });
        setLoading(false);
        return;
      }

      // Save user session for cross-project accessibility
      const sessionObj = {
        id: user.id,
        name: user.name || username,
        email: user.email || `${username}@example.com`,
        phone: user.phone || '',
        role: user.role,
        property: user.property || '',
        room: user.room || '',
        address: user.address || '',
        token: user.token,
      };

      sessionStorage.setItem('pg_user', JSON.stringify(sessionObj));
      sessionStorage.setItem('tenant_user', JSON.stringify(sessionObj));
      sessionStorage.setItem('warden_user', JSON.stringify(sessionObj));
      sessionStorage.setItem('guest_user', JSON.stringify(sessionObj));
      if (user.role === 'super_admin' && user.token) {
        sessionStorage.setItem('super_admin_token', user.token);
      }
      localStorage.setItem('currentUser', JSON.stringify(sessionObj));
      localStorage.setItem('pg_user', JSON.stringify(sessionObj));

      if (setTenantSession) {
        setTenantSession(sessionObj);
      }

      const formattedRole = (user.role || 'user').charAt(0).toUpperCase() + (user.role || 'user').slice(1).replace('_', ' ');
      setBanner({ text: `Directing ${sessionObj.name} to ${formattedRole} portal...`, type: 'success' });

      setTimeout(() => {
        if (location.state?.from) {
          navigate(location.state.from);
        } else {
          routeUser(user.role);
        }
      }, 800);
    } catch (err) {
      console.error('Login error:', err);
      setBanner({ text: 'Login encountered an unexpected network error. Please verify backend is running.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Guest Signup Handlers
  const handleGuestNext = () => {
    const errs = {};
    if (guestStep === 1) {
      if (!guestData.name.trim()) errs.name = 'Full name is required';
      if (!guestData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestData.email)) {
        errs.email = 'Enter a valid email address';
      }
      if (!guestData.phone.trim() || !/^\+?[\d\s\-]{9,}$/.test(guestData.phone)) {
        errs.phone = 'Enter a valid phone number (min 9 digits)';
      }
      if (Object.keys(errs).length > 0) {
        setGuestErr(errs);
        return;
      }
      setGuestErr({});
      setGuestStep(2);
    } else if (guestStep === 2) {
      if (!guestData.dob) errs.dob = 'Date of birth is required';
      if (!guestData.city.trim()) errs.city = 'City is required';
      if (!guestData.address.trim()) errs.address = 'Address is required';
      if (Object.keys(errs).length > 0) {
        setGuestErr(errs);
        return;
      }
      setGuestErr({});
      setGuestStep(3);
    }
  };

  const checkPasswordStrength = (val) => {
    let score = 0;
    if (val.length >= 8) score += 35;
    if (/[A-Z]/.test(val)) score += 20;
    if (/[0-9]/.test(val)) score += 25;
    if (/[^A-Za-z0-9]/.test(val)) score += 20;
    setPwStrength(Math.min(100, score));
  };

  const handleGuestSignupSubmit = async () => {
    const errs = {};
    if (!guestData.password || guestData.password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    }
    if (guestData.password !== guestData.confirm) {
      errs.confirm = 'Passwords do not match';
    }
    if (Object.keys(errs).length > 0) {
      setGuestErr(errs);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/users/guest-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: guestData.name.trim(),
          email: guestData.email.trim(),
          phone: guestData.phone.trim(),
          password: guestData.password,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        setGuestErr({ password: errJson.message || 'Failed to create account. Email may already be registered.' });
        setLoading(false);
        return;
      }

      const createdUser = await res.json();

      const sessionObj = {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        phone: createdUser.phone,
        role: createdUser.role || 'guest',
        tempPassword: guestData.password,
      };

      sessionStorage.setItem('pg_user', JSON.stringify(sessionObj));
      sessionStorage.setItem('guest_user', JSON.stringify(sessionObj));
      localStorage.setItem('currentUser', JSON.stringify(sessionObj));

      setSuccessInfo({
        title: 'Account Created! 🎉',
        message: `Welcome to RentBro, ${createdUser.name}! Your account has been registered in Neon PostgreSQL.`,
        isRedirect: true,
      });
      setViewMode('success');

      setTimeout(() => {
        if (location.state?.from) {
          navigate(location.state.from);
        } else {
          routeUser('guest');
        }
      }, 1500);
    } catch (err) {
      console.error('Guest registration network error:', err);
      setGuestErr({ password: 'An unexpected network error occurred. Please verify backend is running.' });
    } finally {
      setLoading(false);
    }
  };

  // Owner Registration Submit
  const handleOwnerRegSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!ownerData.name.trim()) errs.name = 'Full name is required';
    if (!ownerData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerData.email)) {
      errs.email = 'Enter a valid email address';
    }
    if (!ownerData.phone.trim()) errs.phone = 'Enter a valid phone number';
    if (!ownerData.propname.trim()) errs.propname = 'Property name is required';
    if (!ownerData.propaddr.trim()) errs.propaddr = 'Property address is required';
    if (!ownerData.city.trim()) errs.city = 'City is required';
    if (!ownerData.state.trim()) errs.state = 'State is required';
    if (!ownerData.rooms || parseInt(ownerData.rooms) < 1) errs.rooms = 'Enter a valid room count';
    if (!ownerData.capacity || parseInt(ownerData.capacity) < 1) errs.capacity = 'Enter a valid capacity';
    if (!ownerData.commission) errs.commission = 'You must agree to the commission terms';

    if (Object.keys(errs).length > 0) {
      setOwnerErr(errs);
      return;
    }

    const registeredOwners = JSON.parse(localStorage.getItem('registered_owners') || '[]');
    const newOwner = {
      id: Date.now(),
      name: ownerData.name.trim(),
      email: ownerData.email.trim(),
      phone: ownerData.phone.trim(),
      propertyName: ownerData.propname.trim(),
      propertyAddress: ownerData.propaddr.trim(),
      city: ownerData.city.trim(),
      state: ownerData.state.trim(),
      totalRooms: parseInt(ownerData.rooms),
      totalCapacity: parseInt(ownerData.capacity),
      amenities: ownerData.amenities,
      commissionAgreed: true,
      role: 'owner',
      status: 'pending',
      registeredOn: new Date().toISOString().split('T')[0],
      docsVerified: false,
      inspectionPassed: false,
    };

    registeredOwners.push(newOwner);
    localStorage.setItem('registered_owners', JSON.stringify(registeredOwners));

    // Admin cross notification
    const crossNotifs = JSON.parse(localStorage.getItem('cross_notifications') || '[]');
    crossNotifs.push({
      id: Date.now(),
      title: 'New Property Registration',
      message: `Owner ${ownerData.name} submitted property "${ownerData.propname}" for verification.`,
      type: 'warning',
      priority: 'urgent',
      targetRole: 'admin',
      by: ownerData.name,
      sentAt: new Date().toLocaleString(),
    });
    localStorage.setItem('cross_notifications', JSON.stringify(crossNotifs));

    setSuccessInfo({
      title: 'Registration Submitted',
      message: `Thank you, ${ownerData.name}. Your property "${ownerData.propname}" has been submitted for admin review. You will be notified once documents are verified.`,
      isRedirect: false,
    });
    setViewMode('success');
  };

  const toggleAmenity = (val) => {
    setOwnerData((prev) => {
      const exists = prev.amenities.includes(val);
      return {
        ...prev,
        amenities: exists ? prev.amenities.filter((a) => a !== val) : [...prev.amenities, val],
      };
    });
  };

  return (
    <div className="exact-login-page">
      <div className="main-container">
        {/* Navigation Back to Landing Page / PG Discovery */}
        <button
          onClick={() => navigate('/')}
          className="home-back-link"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          title="Return to PG Discovery"
        >
          <span className="material-icons-outlined" style={{ fontSize: '24px' }}>
            arrow_back
          </span>
          Home
        </button>

        {/* Brand Top Header */}
        <div className="top-header">
          <div className="brand-logo">
            <span className="brand-icon">
              <span className="material-icons-outlined" style={{ fontSize: '32px' }}>
                apartment
              </span>
            </span>
            <span className="brand-name">RentBro</span>
          </div>
          <h1 className="brand-headline">Smart PG Management System</h1>
        </div>

        {/* Card Panel Inner Container */}
        <div className="card-panel">
          <div
            className="card-panel-inner"
            style={{
              maxWidth: viewMode === 'signup' ? '950px' : viewMode === 'owner_reg' ? '800px' : '480px',
            }}
          >
            {/* Back Button */}
            {viewMode !== 'role_select' && viewMode !== 'success' && (
              <button id="back-btn" className="back-btn" onClick={goBack}>
                ← Back to Roles
              </button>
            )}

            {/* 1. ROLE SELECTOR VIEW */}
            {viewMode === 'role_select' && (
              <div id="role-selector" className="card role-card">
                <div className="role-layout">
                  <div className="role-layout-text">
                    <h2 className="card-title">Select Your Role</h2>
                  </div>

                  <div className="role-grid">
                    <button className="role-btn" onClick={() => selectRole('super_admin')}>
                      <div className="role-initial">S</div>
                      Super Admin
                    </button>
                    <button className="role-btn" onClick={() => selectRole('admin')}>
                      <div className="role-initial">A</div>
                      Admin
                    </button>
                    <button className="role-btn" onClick={() => selectRole('tenant')}>
                      <div className="role-initial">T</div>
                      Tenant
                    </button>
                    <button className="role-btn" onClick={() => selectRole('guest')}>
                      <div className="role-initial">G</div>
                      Guest
                    </button>
                    <button className="role-btn" onClick={() => selectRole('owner')}>
                      <div className="role-initial">O</div>
                      Owner
                    </button>
                    <button className="role-btn" onClick={() => selectRole('warden')}>
                      <div className="role-initial">W</div>
                      Warden
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. LOGIN FORM VIEW */}
            {viewMode === 'login' && currentRole && (
              <div id="login-card-area" className="card login-card">
                <h2 id="login-role-title" className="card-title">
                  {ROLE_INFO[currentRole]?.title || 'Login'}
                </h2>
                <p id="login-role-sub" className="card-sub">
                  {ROLE_INFO[currentRole]?.sub || 'Enter your credentials'}
                </p>

                {banner.text && (
                  <div className={`login-banner ${banner.type}`} style={{ display: 'block' }}>
                    {banner.text}
                  </div>
                )}

                <form id="main-login-form" onSubmit={handleLogin}>
                  <div className="form-field">
                    <label id="username-label">
                      {currentRole === 'guest' ? 'Email / Phone No' : 'Username'}
                    </label>
                    <div className="inp-wrap">
                      <span className="inp-ico">
                        <span className="material-icons-outlined" style={{ fontSize: '20px' }}>
                          person
                        </span>
                      </span>
                      <input
                        type="text"
                        id="login-username"
                        placeholder={currentRole === 'guest' ? 'guest@gmail.com' : 'Enter your username'}
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value);
                          setUsernameErr('');
                        }}
                        className={usernameErr ? 'input-error' : ''}
                      />
                    </div>
                    {usernameErr && <div className="login-err-msg">{usernameErr}</div>}
                  </div>

                  <div className="form-field">
                    <label>Password</label>
                    <div className="inp-wrap">
                      <span className="inp-ico">
                        <span className="material-icons-outlined" style={{ fontSize: '20px' }}>
                          lock
                        </span>
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="login-password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setPasswordErr('');
                        }}
                        className={passwordErr ? 'input-error' : ''}
                      />
                      <span
                        className="toggle-pw"
                        onClick={() => setShowPassword(!showPassword)}
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        <span className="material-icons-outlined" style={{ fontSize: '24px' }}>
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </span>
                    </div>
                    {passwordErr && <div className="login-err-msg">{passwordErr}</div>}
                  </div>

                  <button type="submit" className="btn-login" disabled={loading}>
                    {loading ? 'Signing In...' : 'Sign In'}
                  </button>
                </form>

                {/* Role Specific Footers */}
                {currentRole === 'guest' && (
                  <div id="guest-footer" className="card-footer" style={{ display: 'block' }}>
                    New to PG Rental Hub?{' '}
                    <a
                      href="#signup"
                      className="footer-link"
                      onClick={(e) => {
                        e.preventDefault();
                        setViewMode('signup');
                      }}
                    >
                      Create Guest Account
                    </a>
                  </div>
                )}

                {currentRole === 'owner' && (
                  <div id="owner-register-link" className="card-footer" style={{ display: 'block' }}>
                    Want to list your PG?{' '}
                    <a
                      href="#register"
                      className="footer-link"
                      onClick={(e) => {
                        e.preventDefault();
                        setViewMode('owner_reg');
                      }}
                    >
                      Register Property
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* 3. MULTI-STEP GUEST SIGNUP VIEW */}
            {viewMode === 'signup' && (
              <div id="guest-signup-area" className="signup-layout">
                <div className="stepper-panel">
                  <div className="stepper-brand">
                    <div className="stepper-avatar">G</div>
                    <div>
                      <h3>Guest Signup</h3>
                      <p>Quick &amp; Easy</p>
                    </div>
                  </div>
                  <h2 className="stepper-headline" id="signup-title">
                    {guestStep === 1
                      ? 'Personal Info'
                      : guestStep === 2
                      ? 'Address Details'
                      : 'Secure Account'}
                  </h2>
                  <p className="stepper-sub" id="signup-subtitle">
                    Step {guestStep} of 3
                  </p>

                  <div className="steps-list">
                    <div className={`step-item ${guestStep === 1 ? 'active' : guestStep > 1 ? 'done' : ''}`}>
                      <div className="step-circle">1</div>
                      <div className="step-info">
                        <strong>Personal</strong>
                        <span>Basic details</span>
                      </div>
                    </div>
                    <div className={`step-item ${guestStep === 2 ? 'active' : guestStep > 2 ? 'done' : ''}`}>
                      <div className="step-circle">2</div>
                      <div className="step-info">
                        <strong>Address</strong>
                        <span>Location info</span>
                      </div>
                    </div>
                    <div className={`step-item ${guestStep === 3 ? 'active' : ''}`}>
                      <div className="step-circle">3</div>
                      <div className="step-info">
                        <strong>Security</strong>
                        <span>Set password</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card signup-card" id="signup-body">
                  {guestStep === 1 && (
                    <div className="step-animated">
                      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                        <div style={{ fontSize: '42px', marginBottom: '12px' }}>👋</div>
                        <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>
                          Welcome! Let's get to know you
                        </h3>
                        <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.5, padding: '0 10px' }}>
                          Please provide your basic details so we can set up your profile.
                        </p>
                      </div>

                      <div className="owner-reg-grid" style={{ gap: '20px', marginBottom: '24px' }}>
                        <div className="reg-field full" style={{ marginBottom: 0 }}>
                          <label>Full Name *</label>
                          <div className="reg-inp-wrap">
                            <span className="reg-ico">👤</span>
                            <input
                              type="text"
                              id="g-name"
                              placeholder="Enter your full name"
                              value={guestData.name}
                              onChange={(e) => setGuestData({ ...guestData, name: e.target.value })}
                            />
                          </div>
                          {guestErr.name && <div className="reg-err" style={{ display: 'block' }}>{guestErr.name}</div>}
                        </div>

                        <div className="reg-field" style={{ marginBottom: 0 }}>
                          <label>Email Address *</label>
                          <div className="reg-inp-wrap">
                            <span className="reg-ico">✉️</span>
                            <input
                              type="email"
                              id="g-email"
                              placeholder="your.email@example.com"
                              value={guestData.email}
                              onChange={(e) => setGuestData({ ...guestData, email: e.target.value })}
                            />
                          </div>
                          {guestErr.email && <div className="reg-err" style={{ display: 'block' }}>{guestErr.email}</div>}
                        </div>

                        <div className="reg-field" style={{ marginBottom: 0 }}>
                          <label>Phone Number *</label>
                          <div className="reg-inp-wrap">
                            <span className="reg-ico">📞</span>
                            <input
                              type="tel"
                              id="g-phone"
                              placeholder="+91 98765 43210"
                              value={guestData.phone}
                              onChange={(e) => setGuestData({ ...guestData, phone: e.target.value })}
                            />
                          </div>
                          {guestErr.phone && <div className="reg-err" style={{ display: 'block' }}>{guestErr.phone}</div>}
                        </div>
                      </div>

                      <div className="reg-actions">
                        <button className="btn-next" onClick={handleGuestNext}>
                          Next Step →
                        </button>
                      </div>
                      <p className="reg-login-link">
                        Already have an account?{' '}
                        <a
                          href="#login"
                          onClick={(e) => {
                            e.preventDefault();
                            selectRole('guest');
                          }}
                        >
                          Sign in
                        </a>
                      </p>
                    </div>
                  )}

                  {guestStep === 2 && (
                    <div className="step-animated">
                      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                        <div style={{ fontSize: '42px', marginBottom: '12px' }}>🌍</div>
                        <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>
                          Where are you from?
                        </h3>
                        <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.5, padding: '0 10px' }}>
                          Help us tailor your experience by providing your location details.
                        </p>
                      </div>

                      <div className="owner-reg-grid" style={{ gap: '20px', marginBottom: '24px' }}>
                        <div className="reg-field" style={{ marginBottom: 0 }}>
                          <label>Date of Birth *</label>
                          <div className="reg-inp-wrap">
                            <span className="reg-ico">📅</span>
                            <input
                              type="date"
                              id="g-dob"
                              value={guestData.dob}
                              onChange={(e) => setGuestData({ ...guestData, dob: e.target.value })}
                            />
                          </div>
                          {guestErr.dob && <div className="reg-err" style={{ display: 'block' }}>{guestErr.dob}</div>}
                        </div>

                        <div className="reg-field" style={{ marginBottom: 0 }}>
                          <label>City *</label>
                          <div className="reg-inp-wrap">
                            <span className="reg-ico">🏙️</span>
                            <input
                              type="text"
                              id="g-city"
                              placeholder="Enter your city"
                              value={guestData.city}
                              onChange={(e) => setGuestData({ ...guestData, city: e.target.value })}
                            />
                          </div>
                          {guestErr.city && <div className="reg-err" style={{ display: 'block' }}>{guestErr.city}</div>}
                        </div>

                        <div className="reg-field full" style={{ marginBottom: 0 }}>
                          <label>Current Address *</label>
                          <div className="reg-inp-wrap">
                            <span className="reg-ico">📍</span>
                            <textarea
                              id="g-address"
                              placeholder="Enter your current address"
                              rows="2"
                              value={guestData.address}
                              onChange={(e) => setGuestData({ ...guestData, address: e.target.value })}
                            ></textarea>
                          </div>
                          {guestErr.address && <div className="reg-err" style={{ display: 'block' }}>{guestErr.address}</div>}
                        </div>
                      </div>

                      <div className="reg-actions two-btn">
                        <button className="btn-prev" onClick={() => setGuestStep(1)}>
                          ← Previous
                        </button>
                        <button className="btn-next flex-1" onClick={handleGuestNext}>
                          Next Step →
                        </button>
                      </div>
                      <p className="reg-login-link">
                        Already have an account?{' '}
                        <a
                          href="#login"
                          onClick={(e) => {
                            e.preventDefault();
                            selectRole('guest');
                          }}
                        >
                          Sign in
                        </a>
                      </p>
                    </div>
                  )}

                  {guestStep === 3 && (
                    <div className="step-animated">
                      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                        <div style={{ fontSize: '42px', marginBottom: '12px' }}>🛡️</div>
                        <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>
                          Secure Your Account
                        </h3>
                        <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.5, padding: '0 10px' }}>
                          Create a strong password to protect your bookings and personal information.
                        </p>
                      </div>

                      <div className="reg-field">
                        <label>Password *</label>
                        <div className="reg-inp-wrap">
                          <span className="reg-ico">🔒</span>
                          <input
                            type="password"
                            id="g-password"
                            placeholder="Create a strong password"
                            value={guestData.password}
                            onChange={(e) => {
                              setGuestData({ ...guestData, password: e.target.value });
                              checkPasswordStrength(e.target.value);
                            }}
                          />
                        </div>
                        <div
                          className="pw-strength-bar"
                          style={{
                            height: '4px',
                            background: '#e2e8f0',
                            marginTop: '8px',
                            borderRadius: '2px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            id="pw-fill"
                            style={{
                              height: '100%',
                              width: `${pwStrength}%`,
                              transition: 'all 0.3s',
                              background:
                                pwStrength < 40 ? 'var(--red)' : pwStrength < 75 ? 'var(--primary)' : 'var(--green)',
                            }}
                          ></div>
                        </div>
                        <small id="pw-hint" style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                          Use at least 8 characters with letters, numbers, and symbols
                        </small>
                        {guestErr.password && <div className="reg-err" style={{ display: 'block' }}>{guestErr.password}</div>}
                      </div>

                      <div className="reg-field">
                        <label>Confirm Password *</label>
                        <div className="reg-inp-wrap">
                          <span className="reg-ico">🔒</span>
                          <input
                            type="password"
                            id="g-confirm"
                            placeholder="Re-enter your password"
                            value={guestData.confirm}
                            onChange={(e) => setGuestData({ ...guestData, confirm: e.target.value })}
                          />
                        </div>
                        {guestErr.confirm && <div className="reg-err" style={{ display: 'block' }}>{guestErr.confirm}</div>}
                      </div>

                      <div className="reg-actions two-btn">
                        <button className="btn-prev" onClick={() => setGuestStep(2)}>
                          ← Previous
                        </button>
                        <button className="btn-next flex-1" onClick={handleGuestSignupSubmit}>
                          Create Account
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. OWNER REGISTRATION VIEW */}
            {viewMode === 'owner_reg' && (
              <div id="owner-reg-area" className="card owner-reg-card">
                <h2 className="card-title">Register Property</h2>
                <p className="card-sub">Partner with us and list your PG</p>

                <form onSubmit={handleOwnerRegSubmit}>
                  <div className="owner-reg-grid">
                    <div className="reg-field">
                      <label>Full Name *</label>
                      <div className="reg-inp-wrap">
                        <span className="reg-ico">👤</span>
                        <input
                          type="text"
                          placeholder="Enter your full name"
                          value={ownerData.name}
                          onChange={(e) => setOwnerData({ ...ownerData, name: e.target.value })}
                        />
                      </div>
                      {ownerErr.name && <div className="reg-err" style={{ display: 'block' }}>{ownerErr.name}</div>}
                    </div>

                    <div className="reg-field">
                      <label>Email Address *</label>
                      <div className="reg-inp-wrap">
                        <span className="reg-ico">✉️</span>
                        <input
                          type="email"
                          placeholder="Enter your email"
                          value={ownerData.email}
                          onChange={(e) => setOwnerData({ ...ownerData, email: e.target.value })}
                        />
                      </div>
                      {ownerErr.email && <div className="reg-err" style={{ display: 'block' }}>{ownerErr.email}</div>}
                    </div>

                    <div className="reg-field">
                      <label>Phone Number *</label>
                      <div className="reg-inp-wrap">
                        <span className="reg-ico">📞</span>
                        <input
                          type="tel"
                          placeholder="Enter your phone number"
                          value={ownerData.phone}
                          onChange={(e) => setOwnerData({ ...ownerData, phone: e.target.value })}
                        />
                      </div>
                      {ownerErr.phone && <div className="reg-err" style={{ display: 'block' }}>{ownerErr.phone}</div>}
                    </div>

                    <div className="reg-field">
                      <label>Total Rooms *</label>
                      <div className="reg-inp-wrap">
                        <span className="reg-ico">🏠</span>
                        <input
                          type="number"
                          placeholder="0"
                          min="1"
                          value={ownerData.rooms}
                          onChange={(e) => setOwnerData({ ...ownerData, rooms: e.target.value })}
                        />
                      </div>
                      {ownerErr.rooms && <div className="reg-err" style={{ display: 'block' }}>{ownerErr.rooms}</div>}
                    </div>

                    <div className="reg-field full">
                      <label>PG Property Name *</label>
                      <div className="reg-inp-wrap">
                        <span className="reg-ico">🏢</span>
                        <input
                          type="text"
                          placeholder="Enter PG property name"
                          value={ownerData.propname}
                          onChange={(e) => setOwnerData({ ...ownerData, propname: e.target.value })}
                        />
                      </div>
                      {ownerErr.propname && <div className="reg-err" style={{ display: 'block' }}>{ownerErr.propname}</div>}
                    </div>

                    <div className="reg-field full">
                      <label>Property Address *</label>
                      <div className="reg-inp-wrap">
                        <span className="reg-ico">📍</span>
                        <input
                          type="text"
                          placeholder="Enter complete property address"
                          value={ownerData.propaddr}
                          onChange={(e) => setOwnerData({ ...ownerData, propaddr: e.target.value })}
                        />
                      </div>
                      {ownerErr.propaddr && <div className="reg-err" style={{ display: 'block' }}>{ownerErr.propaddr}</div>}
                    </div>

                    <div className="reg-field">
                      <label>City *</label>
                      <div className="reg-inp-wrap">
                        <span className="reg-ico">🏙️</span>
                        <input
                          type="text"
                          placeholder="City"
                          value={ownerData.city}
                          onChange={(e) => setOwnerData({ ...ownerData, city: e.target.value })}
                        />
                      </div>
                      {ownerErr.city && <div className="reg-err" style={{ display: 'block' }}>{ownerErr.city}</div>}
                    </div>

                    <div className="reg-field">
                      <label>State *</label>
                      <div className="reg-inp-wrap">
                        <span className="reg-ico">🗺️</span>
                        <input
                          type="text"
                          placeholder="State"
                          value={ownerData.state}
                          onChange={(e) => setOwnerData({ ...ownerData, state: e.target.value })}
                        />
                      </div>
                      {ownerErr.state && <div className="reg-err" style={{ display: 'block' }}>{ownerErr.state}</div>}
                    </div>

                    <div className="reg-field">
                      <label>Total Capacity *</label>
                      <div className="reg-inp-wrap">
                        <span className="reg-ico">👥</span>
                        <input
                          type="number"
                          placeholder="0"
                          min="1"
                          value={ownerData.capacity}
                          onChange={(e) => setOwnerData({ ...ownerData, capacity: e.target.value })}
                        />
                      </div>
                      {ownerErr.capacity && <div className="reg-err" style={{ display: 'block' }}>{ownerErr.capacity}</div>}
                    </div>

                    <div className="reg-field full">
                      <label>Amenities</label>
                      <div className="amenities-grid">
                        {['WiFi', 'AC', 'Parking', 'Gym', 'Laundry', 'Food'].map((item) => (
                          <label key={item} className="amenity-check">
                            <input
                              type="checkbox"
                              checked={ownerData.amenities.includes(item)}
                              onChange={() => toggleAmenity(item)}
                            />{' '}
                            {item}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Documentation Notice */}
                  <div className="reg-field full doc-section">
                    <h4 className="doc-title">📄 Documentation Required for Verification</h4>
                    <p className="doc-note">
                      These documents will be reviewed by the admin before your property goes live on the platform.
                    </p>
                    <div className="doc-grid">
                      <div className="reg-field">
                        <label>ID Proof (Aadhaar / PAN / Driving License)</label>
                        <div className="file-inp-wrap">
                          <span className="reg-ico">📋</span>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="file-input"
                            onChange={(e) => setOwnerData({ ...ownerData, idproof: e.target.files[0]?.name })}
                          />
                          <span className="file-label">
                            {ownerData.idproof || 'Choose file...'}
                          </span>
                        </div>
                      </div>

                      <div className="reg-field">
                        <label>Property Images (Multiple)</label>
                        <div className="file-inp-wrap">
                          <span className="reg-ico">🖼️</span>
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png"
                            multiple
                            className="file-input"
                            onChange={(e) =>
                              setOwnerData({
                                ...ownerData,
                                images: Array.from(e.target.files).map((f) => f.name),
                              })
                            }
                          />
                          <span className="file-label">
                            {ownerData.images.length > 0
                              ? `${ownerData.images.length} files selected`
                              : 'Choose files...'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="reg-field full" style={{ marginTop: '8px' }}>
                    <label className="amenity-check commission-check">
                      <input
                        type="checkbox"
                        checked={ownerData.commission}
                        onChange={(e) => setOwnerData({ ...ownerData, commission: e.target.checked })}
                      />{' '}
                      I agree to the <strong>10% platform commission</strong> on all bookings processed through PG
                      Rental Hub.
                    </label>
                    {ownerErr.commission && (
                      <div className="reg-err" style={{ display: 'block' }}>
                        {ownerErr.commission}
                      </div>
                    )}
                  </div>

                  <button type="submit" className="btn-submit-reg">
                    Submit for Verification
                  </button>
                  <p className="reg-login-link" style={{ marginTop: '16px' }}>
                    Already registered?{' '}
                    <a
                      href="#login"
                      onClick={(e) => {
                        e.preventDefault();
                        selectRole('owner');
                      }}
                    >
                      Sign in here
                    </a>
                  </p>
                </form>
              </div>
            )}

            {/* 5. SUCCESS SCREEN VIEW */}
            {viewMode === 'success' && (
              <div id="success-area" className="card success-card show-animated">
                <div className="success-icon-wrap">
                  <span className="material-icons-outlined" style={{ fontSize: '38px', color: 'white' }}>
                    check
                  </span>
                </div>
                <h2 className="card-title" id="success-title">
                  {successInfo.title}
                </h2>
                <p className="card-sub" id="success-message">
                  {successInfo.message}
                </p>

                {successInfo.isRedirect ? (
                  <div className="redirect-loader">
                    <div className="spinner"></div>
                    <span>Taking you to your dashboard...</span>
                  </div>
                ) : (
                  <button className="btn-login" onClick={goBack} id="success-btn">
                    Return to Login
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
