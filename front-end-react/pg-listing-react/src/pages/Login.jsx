import React, { useEffect, useState } from 'react';
import useScreenState from '../app/useScreenState';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  login,
  registerGuest,
  registerOwner,
  selectAuth,
  MANAGEMENT_ROLES,
  ROLE_HOME,
} from '../features/auth/authSlice';
import { toastSuccess, toastInfo } from '../features/ui/uiSlice';
import './Login.css';

/** Paths that only make sense for people who can book (guests and tenants). */
const BOOKING_PATH = /^\/(pg|pgs|book|booking|payment|my-bookings|transactions)(\/|$)/;

export default function Login({ initialMode = 'login' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user: currentUser, status: authStatus, sessionExpired, ownerApplication } = useSelector(selectAuth);
  const loading = authStatus === 'loading';

  // View states: 'login' | 'signup' | 'owner_reg' | 'success'
  const [viewMode, setViewMode] = useScreenState(location.state?.mode === 'owner' ? 'owner_reg' : initialMode);

  // Login form fields
  const [username, setUsername] = useScreenState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useScreenState(false);
  const [usernameErr, setUsernameErr] = useScreenState('');
  const [passwordErr, setPasswordErr] = useScreenState('');
  const [banner, setBanner] = useScreenState(
    sessionExpired ? { text: 'Your session has expired. Please sign in again.', type: 'warning' } : { text: '', type: '' },
  );

  // Guest multi-step signup state
  const [guestStep, setGuestStep] = useScreenState(1);
  const [guestData, setGuestData] = useScreenState({
    name: '',
    email: '',
    phone: '',
    gender: 'male',
    dob: '',
    city: '',
    address: '',
  });
  const [guestPassword, setGuestPassword] = useState('');
  const [guestConfirm, setGuestConfirm] = useState('');
  const [guestErr, setGuestErr] = useScreenState({});
  const [pwStrength, setPwStrength] = useScreenState(0);

  // Owner registration state
  const [ownerData, setOwnerData] = useScreenState({
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
    commission: false,
  });
  const [ownerErr, setOwnerErr] = useScreenState({});

  const [propertyDocument, setPropertyDocument] = useState(null);

  // After signing in: return to where the user was going, else their portal.
  const continueAs = (user) => {
    const { from, resumeRoomId } = location.state || {};
    const home = ROLE_HOME[user.role] || '/listings';
    if (from && from !== '/login') {
      if (MANAGEMENT_ROLES.includes(user.role) && BOOKING_PATH.test(from)) {
        dispatch(toastInfo('Management accounts cannot book rooms, so we opened your portal instead.'));
        navigate(home, { replace: true });
      } else {
        navigate(from, { replace: true, state: resumeRoomId != null ? { resumeRoomId } : null });
      }
      return;
    }
    navigate(home, { replace: true });
  };

  // Continue when the current app session signs in.
  useEffect(() => {
    if (currentUser?.id) continueAs(currentUser);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const goBack = () => {
    setViewMode('login');
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
    if (!username.trim()) {
      setUsernameErr('Username or Email is required');
      valid = false;
    }
    if (!password) {
      setPasswordErr('Password is required');
      valid = false;
    }
    if (!valid) return;

    const result = await dispatch(login({ username, password }));
    if (login.fulfilled.match(result)) {
      dispatch(toastSuccess(`Welcome back, ${result.payload.user.name || 'there'}!`));
    } else {
      const text = result.payload || 'Could not sign you in. Please try again.';
      setBanner({ text, type: /pending/i.test(text) ? 'warning' : 'error' });
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
      if (!guestData.phone.trim() || !/^\+?[\d\s-]{9,}$/.test(guestData.phone)) {
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
    if (!guestPassword || guestPassword.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    }
    if (guestPassword !== guestConfirm) {
      errs.confirm = 'Passwords do not match';
    }
    if (Object.keys(errs).length > 0) {
      setGuestErr(errs);
      return;
    }

    const result = await dispatch(
      registerGuest({
        name: guestData.name.trim(),
        email: guestData.email.trim().toLowerCase(),
        phone: guestData.phone.trim(),
        gender: guestData.gender || 'male',
        password: guestPassword,
      }),
    );
    if (registerGuest.fulfilled.match(result)) {
      dispatch(toastSuccess(`Account created. Welcome to RentBro, ${result.payload.user.name}!`));
    } else {
      setGuestErr({ password: result.payload || 'Could not create your account. Please try again.' });
    }
  };

  // Owner Registration Submit
  const handleOwnerRegSubmit = async (e) => {
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
    if (!propertyDocument) errs.document = 'Choose one property details document';
    else if (propertyDocument.size > 5 * 1024 * 1024) errs.document = 'The document must be 5 MB or less';
    if (!ownerData.commission) errs.commission = 'You must agree to the commission terms';

    if (Object.keys(errs).length > 0) {
      setOwnerErr(errs);
      return;
    }

    const newOwner = {
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
    };

    const result = await dispatch(registerOwner({ details: newOwner, document: propertyDocument }));
    if (registerOwner.rejected.match(result)) {
      setOwnerErr({ submit: result.payload || 'Registration failed. Please try again.' });
      return;
    }

    setPropertyDocument(null);
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
          title="Return to PG Discovery"
          style={{
            position: 'absolute',
            top: '30px',
            left: '40px',
            background: 'linear-gradient(135deg, #d4af37, #b8860b)',
            color: '#111827',
            border: 'none',
            padding: '10px 22px',
            borderRadius: '30px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '700',
            fontSize: '15px',
            boxShadow: '0 4px 14px rgba(212, 175, 55, 0.45)',
            cursor: 'pointer',
            zIndex: 100,
          }}
        >
          <span className="material-icons-outlined" style={{ fontSize: '20px', color: '#111827' }}>
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
            {/* Back Button for signup & owner_reg */}
            {viewMode !== 'login' && viewMode !== 'success' && (
              <button id="back-btn" className="back-btn" onClick={goBack}>
                ← Back to Login
              </button>
            )}

            {/* SINGLE COMMON LOGIN FORM VIEW */}
            {viewMode === 'login' && (
              <div id="login-card-area" className="card login-card">
                <h2 id="login-role-title" className="card-title">
                  Sign In
                </h2>
                <p id="login-role-sub" className="card-sub">
                  Enter your credentials to access your dashboard
                </p>

                {banner.text && (
                  <div className={`login-banner ${banner.type}`} style={{ display: 'block' }}>
                    {banner.text}
                  </div>
                )}

                <form id="main-login-form" onSubmit={handleLogin}>
                  <div className="form-field">
                    <label id="username-label">Username or Email</label>
                    <div className="inp-wrap">
                      <span className="inp-ico">
                        <span className="material-icons-outlined" style={{ fontSize: '20px' }}>
                          person
                        </span>
                      </span>
                      <input
                        type="text"
                        id="login-username"
                        placeholder="Enter username, email or phone"
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value);
                          setUsernameErr('');
                        }}
                        className={usernameErr ? 'input-error' : ''}
                        autoComplete="username"
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
                        autoComplete="current-password"
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

                {/* Footers for Guest Signup & Owner Registration */}
                <div id="guest-footer" className="card-footer" style={{ display: 'block', marginTop: '20px', textAlign: 'center' }}>
                  New to RentBro?{' '}
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

                <div id="owner-register-link" className="card-footer" style={{ display: 'block', marginTop: '8px', textAlign: 'center' }}>
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

                        <div className="reg-field full" style={{ marginBottom: 0 }}>
                          <label>Gender * (Required for PG Booking Eligibility)</label>
                          <div className="reg-inp-wrap">
                            <span className="reg-ico">🚻</span>
                            <select
                              id="g-gender"
                              value={guestData.gender}
                              onChange={(e) => setGuestData({ ...guestData, gender: e.target.value })}
                              style={{ width: '100%', height: '44px', cursor: 'pointer' }}
                            >
                              <option value="male">Male (Eligible for Boys &amp; Co-ed PGs)</option>
                              <option value="female">Female (Eligible for Girls &amp; Co-ed PGs)</option>
                              <option value="other">Other (Eligible for Co-ed PGs)</option>
                            </select>
                          </div>
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
                            setViewMode('login');
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
                            setViewMode('login');
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
                            value={guestPassword}
                            onChange={(e) => {
                              setGuestPassword(e.target.value);
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
                            value={guestConfirm}
                            onChange={(e) => setGuestConfirm(e.target.value)}
                          />
                        </div>
                        {guestErr.confirm && <div className="reg-err" style={{ display: 'block' }}>{guestErr.confirm}</div>}
                      </div>

                      <div className="reg-actions two-btn">
                        <button className="btn-prev" onClick={() => setGuestStep(2)}>
                          ← Previous
                        </button>
                        <button className="btn-next flex-1" onClick={handleGuestSignupSubmit} disabled={loading}>
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

                  <div className="reg-field full">
                    <label htmlFor="property-details-document">Property details document *</label>
                    <input id="property-details-document" type="file" accept=".pdf,.jpg,.jpeg,.png" required
                      onChange={(event) => setPropertyDocument(event.target.files[0] || null)} />
                    <p className="doc-note">Upload one PDF, JPG, or PNG up to 5 MB for admin verification.</p>
                    {ownerErr.document && <p className="reg-err" role="alert" style={{ display: 'block' }}>{ownerErr.document}</p>}
                    {ownerErr.submit && <p className="reg-err" role="alert" style={{ display: 'block' }}>{ownerErr.submit}</p>}
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

                  <button type="submit" className="btn-submit-reg" disabled={loading}>
                    {loading ? 'Submitting…' : 'Submit for Verification'}
                  </button>
                  <p className="reg-login-link" style={{ marginTop: '16px' }}>
                    Already registered?{' '}
                    <a
                      href="#login"
                      onClick={(e) => {
                        e.preventDefault();
                        setViewMode('login');
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
                  Registration Submitted
                </h2>
                <p className="card-sub" id="success-message">
                  {ownerApplication && `Thank you, ${ownerApplication.applicantName}. "${ownerApplication.propertyName}" and its document have been submitted for admin review.`}
                </p>

                <button className="btn-login" onClick={goBack} id="success-btn">
                    Return to Login
                  </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
