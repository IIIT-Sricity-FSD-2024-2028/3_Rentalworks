import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const API_BASE = 'http://localhost:3000';

const ROLES = [
  { id: 'tenant', label: 'PG Tenant', initial: 'T', desc: 'Resident stay & payments' },
  { id: 'warden', label: 'PG Warden', initial: 'W', desc: 'Daily operations & rooms' },
  { id: 'owner', label: 'Property Owner', initial: 'O', desc: 'PG listings & occupancy' },
  { id: 'admin', label: 'Admin', initial: 'A', desc: 'User & property verification' },
  { id: 'super_admin', label: 'Super Admin', initial: 'S', desc: 'Platform oversight & config' },
  { id: 'guest', label: 'Guest User', initial: 'G', desc: 'Explore & book rooms' },
];

const DEMO_CREDENTIALS = {
  tenant: { username: 'tenant1', password: 'password123', label: 'Arun Kumar (Tenant)' },
  warden: { username: 'warden', password: 'admin123', label: 'Warden Officer' },
  owner: { username: 'owner1', password: 'admin123', label: 'PG Owner One' },
  admin: { username: 'admin', password: 'admin123', label: 'System Admin' },
  super_admin: { username: 'superadmin', password: 'admin123', label: 'Super Admin' },
  guest: { username: 'guest@gmail.com', password: 'guest123', label: 'Demo Guest' },
};

export default function Login() {
  const navigate = useNavigate();
  const { setTenantSession } = useAuth();

  const [selectedRole, setSelectedRole] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState({ text: '', type: '' });

  // Guest Signup state
  const [isGuestSignup, setIsGuestSignup] = useState(false);
  const [signupStep, setSignupStep] = useState(1);
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    phone: '',
    city: 'Hyderabad',
    password: '',
  });

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
    setBanner({ text: '', type: '' });
    if (DEMO_CREDENTIALS[roleId]) {
      setUsername(DEMO_CREDENTIALS[roleId].username);
      setPassword(DEMO_CREDENTIALS[roleId].password);
    } else {
      setUsername('');
      setPassword('');
    }
  };

  const handleAutofill = (roleId) => {
    setSelectedRole(roleId);
    setUsername(DEMO_CREDENTIALS[roleId].username);
    setPassword(DEMO_CREDENTIALS[roleId].password);
    setBanner({ text: `Autofilled demo credentials for ${DEMO_CREDENTIALS[roleId].label}`, type: 'warning' });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setBanner({ text: 'Please enter both username and password.', type: 'error' });
      return;
    }

    setLoading(true);
    setBanner({ text: '', type: '' });

    try {
      // 1. Try Live Backend API
      let user = null;
      let token = null;

      try {
        const response = await fetch(`${API_BASE}/users/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.trim(), password }),
        });

        if (response.ok) {
          const data = await response.json();
          user = data;
          token = data.token;
        }
      } catch (networkErr) {
        console.warn('Backend login network notice, checking fallback mock auth', networkErr);
      }

      // 2. Fallback / Demo Credentials Resolver if backend is offline or mock user
      if (!user) {
        const demo = DEMO_CREDENTIALS[selectedRole || 'tenant'];
        if (demo && (username === demo.username || username === 'tenant') && (password === demo.password || password === 'password123')) {
          user = {
            id: selectedRole === 'tenant' ? 1 : 9,
            name: demo.label,
            username: demo.username,
            email: `${demo.username}@example.com`,
            role: selectedRole || 'tenant',
            status: 'active',
          };
        }
      }

      if (!user) {
        throw new Error('Invalid credentials. Please verify your username and password.');
      }

      // 3. Persist Session
      const sessionObj = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role || selectedRole || 'tenant',
        username: user.username,
        token: token || user.token,
        status: user.status || 'active',
      };

      sessionStorage.setItem('pg_user', JSON.stringify(sessionObj));
      sessionStorage.setItem('tenant_user', JSON.stringify(sessionObj));
      localStorage.setItem('currentUser', JSON.stringify(sessionObj));

      if (setTenantSession) {
        setTenantSession(sessionObj);
      }

      setBanner({ text: `Welcome, ${user.name}! Redirecting to portal...`, type: 'success' });

      // 4. Role-based Navigation
      setTimeout(() => {
        const role = user.role || selectedRole;
        if (role === 'tenant') {
          navigate('/dashboard');
        } else if (role === 'guest') {
          // Navigate to PG Discovery
          window.location.href = 'http://localhost:5174/listings';
        } else if (role === 'warden') {
          window.location.href = 'http://localhost:5175/';
        } else if (role === 'owner') {
          window.location.href = 'http://localhost:5174/';
        } else if (role === 'admin') {
          window.location.href = 'http://localhost:5173/';
        } else if (role === 'super_admin') {
          window.location.href = 'http://localhost:5176/';
        } else {
          navigate('/dashboard');
        }
      }, 900);

    } catch (err) {
      console.error('Login error:', err);
      setBanner({ text: err.message || 'Login failed. Please check credentials.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignupSubmit = async (e) => {
    e.preventDefault();
    if (!signupForm.name || !signupForm.email || !signupForm.password) {
      setBanner({ text: 'Please fill in all required fields.', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/guest-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupForm),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Registration failed');
      }

      const newUser = await res.json();
      sessionStorage.setItem('pg_user', JSON.stringify(newUser));
      localStorage.setItem('currentUser', JSON.stringify(newUser));

      setBanner({ text: 'Guest account created! Redirecting to PG Discovery...', type: 'success' });
      setTimeout(() => {
        window.location.href = 'http://localhost:5174/listings';
      }, 1000);
    } catch (err) {
      setBanner({ text: err.message || 'Registration failed.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-root">
      {/* Floating Home Link */}
      <a
        href="http://localhost:5174/listings"
        className="login-home-btn"
        title="Go to PG Discovery & Listings"
      >
        <span className="material-icons-outlined" style={{ fontSize: '20px' }}>
          storefront
        </span>
        PG Listings / Discovery
      </a>

      {/* Brand Top Header */}
      <div className="login-top-header">
        <div className="login-brand-logo">
          <div className="login-brand-icon">
            <span className="material-icons-outlined" style={{ fontSize: '28px' }}>
              apartment
            </span>
          </div>
          <span className="login-brand-name">RentBro</span>
        </div>
        <h1 className="login-brand-headline">Smart PG Management System</h1>
        <p className="login-brand-sub">
          Single unified digital platform for PG discovery, automated room booking, and post-stay management.
        </p>
      </div>

      {/* Main Card Panel */}
      <div className={`login-card-panel ${isGuestSignup ? 'wide' : ''}`}>
        <div className="login-card-box">
          {/* Notification Banner */}
          {banner.text && (
            <div className={`login-banner-box ${banner.type}`}>
              <span className="material-icons-outlined" style={{ fontSize: '20px' }}>
                {banner.type === 'error' ? 'error_outline' : banner.type === 'success' ? 'check_circle' : 'info'}
              </span>
              <span>{banner.text}</span>
            </div>
          )}

          {isGuestSignup ? (
            /* MULTI-STEP GUEST SIGNUP */
            <div>
              <button
                className="login-back-btn"
                onClick={() => {
                  setIsGuestSignup(false);
                  setBanner({ text: '', type: '' });
                }}
              >
                ← Back to Login
              </button>

              <div className="login-card-header">
                <h2>Create Guest Account</h2>
                <p>Register as a guest to browse, shortlist, and book PG rooms instantly.</p>
              </div>

              <div className="signup-multi-stepper">
                <div className="signup-step-aside">
                  <div className={`signup-step-item ${signupStep === 1 ? 'active' : ''}`}>
                    <div className="signup-step-num">1</div>
                    <div>
                      <strong>Personal</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Name & Contact</div>
                    </div>
                  </div>
                  <div className={`signup-step-item ${signupStep === 2 ? 'active' : ''}`}>
                    <div className="signup-step-num">2</div>
                    <div>
                      <strong>Address</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>City & Location</div>
                    </div>
                  </div>
                  <div className={`signup-step-item ${signupStep === 3 ? 'active' : ''}`}>
                    <div className="signup-step-num">3</div>
                    <div>
                      <strong>Security</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Set Password</div>
                    </div>
                  </div>
                </div>

                <div className="signup-step-content">
                  <form onSubmit={handleGuestSignupSubmit}>
                    {signupStep === 1 && (
                      <div>
                        <div className="login-form-group">
                          <label>Full Name *</label>
                          <div className="login-input-wrap">
                            <span className="material-icons-outlined login-input-icon">person</span>
                            <input
                              type="text"
                              placeholder="e.g. Rahul Sharma"
                              value={signupForm.name}
                              onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                        <div className="login-form-group">
                          <label>Email Address *</label>
                          <div className="login-input-wrap">
                            <span className="material-icons-outlined login-input-icon">email</span>
                            <input
                              type="email"
                              placeholder="e.g. rahul@example.com"
                              value={signupForm.email}
                              onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                        <div className="login-form-group">
                          <label>Phone Number *</label>
                          <div className="login-input-wrap">
                            <span className="material-icons-outlined login-input-icon">phone</span>
                            <input
                              type="tel"
                              placeholder="e.g. +91 98765 43210"
                              value={signupForm.phone}
                              onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          className="login-submit-btn"
                          onClick={() => setSignupStep(2)}
                        >
                          Next: Address Info →
                        </button>
                      </div>
                    )}

                    {signupStep === 2 && (
                      <div>
                        <div className="login-form-group">
                          <label>Current City</label>
                          <div className="login-input-wrap">
                            <span className="material-icons-outlined login-input-icon">location_city</span>
                            <input
                              type="text"
                              placeholder="e.g. Hyderabad / Bangalore"
                              value={signupForm.city}
                              onChange={(e) => setSignupForm({ ...signupForm, city: e.target.value })}
                            />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            type="button"
                            className="login-back-btn"
                            style={{ flex: 1, justifyContent: 'center' }}
                            onClick={() => setSignupStep(1)}
                          >
                            ← Back
                          </button>
                          <button
                            type="button"
                            className="login-submit-btn"
                            style={{ flex: 2, marginTop: 0 }}
                            onClick={() => setSignupStep(3)}
                          >
                            Next: Security →
                          </button>
                        </div>
                      </div>
                    )}

                    {signupStep === 3 && (
                      <div>
                        <div className="login-form-group">
                          <label>Create Account Password *</label>
                          <div className="login-input-wrap">
                            <span className="material-icons-outlined login-input-icon">lock</span>
                            <input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Minimum 6 characters"
                              value={signupForm.password}
                              onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                              required
                            />
                            <span
                              className="login-pw-toggle"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              <span className="material-icons-outlined" style={{ fontSize: '20px' }}>
                                {showPassword ? 'visibility_off' : 'visibility'}
                              </span>
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            type="button"
                            className="login-back-btn"
                            style={{ flex: 1, justifyContent: 'center' }}
                            onClick={() => setSignupStep(2)}
                          >
                            ← Back
                          </button>
                          <button
                            type="submit"
                            className="login-submit-btn"
                            style={{ flex: 2, marginTop: 0 }}
                            disabled={loading}
                          >
                            {loading ? 'Creating...' : 'Complete Registration'}
                          </button>
                        </div>
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </div>
          ) : !selectedRole ? (
            /* STEP 1: ROLE SELECTOR */
            <div>
              <div className="login-card-header" style={{ textAlign: 'center' }}>
                <h2>Select Your Role</h2>
                <p>Choose your account type to access your dedicated management portal.</p>
              </div>

              <div className="login-role-grid">
                {ROLES.map((role) => (
                  <button
                    key={role.id}
                    className="login-role-btn"
                    onClick={() => handleRoleSelect(role.id)}
                    type="button"
                  >
                    <div className="login-role-avatar">{role.initial}</div>
                    <span>{role.label}</span>
                    <span className="login-role-desc">{role.desc}</span>
                  </button>
                ))}
              </div>

              {/* QUICK DEMO SWITCHER */}
              <div className="login-demo-bar">
                <div className="login-demo-title">
                  <span>⚡ Quick 1-Click Demo Login</span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Preloaded accounts</span>
                </div>
                <div className="login-demo-chips">
                  {Object.entries(DEMO_CREDENTIALS).map(([k, v]) => (
                    <button
                      key={k}
                      type="button"
                      className="demo-chip-btn"
                      onClick={() => handleAutofill(k)}
                    >
                      <span style={{ color: '#c49a1a' }}>●</span> {v.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* STEP 2: LOGIN FORM */
            <div>
              <button className="login-back-btn" onClick={() => setSelectedRole(null)}>
                ← Back to Roles
              </button>

              <div className="login-card-header">
                <h2>
                  <span className="material-icons-outlined" style={{ color: '#c49a1a' }}>
                    lock_open
                  </span>
                  {ROLES.find((r) => r.id === selectedRole)?.label} Sign In
                </h2>
                <p>Enter your registered credentials to access your dashboard.</p>
              </div>

              <form onSubmit={handleLoginSubmit}>
                <div className="login-form-group">
                  <label>
                    {selectedRole === 'guest' ? 'Email Address / Phone Number' : 'Username or Email'}
                  </label>
                  <div className="login-input-wrap">
                    <span className="material-icons-outlined login-input-icon">person</span>
                    <input
                      type="text"
                      placeholder={selectedRole === 'guest' ? 'guest@example.com' : 'Enter your username'}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="login-form-group">
                  <label>Password</label>
                  <div className="login-input-wrap">
                    <span className="material-icons-outlined login-input-icon">lock</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter account password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <span
                      className="login-pw-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <span className="material-icons-outlined" style={{ fontSize: '20px' }}>
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </span>
                  </div>
                </div>

                <button type="submit" className="login-submit-btn" disabled={loading}>
                  <span className="material-icons-outlined" style={{ fontSize: '18px' }}>
                    login
                  </span>
                  {loading ? 'Authenticating...' : `Sign In as ${ROLES.find((r) => r.id === selectedRole)?.label}`}
                </button>
              </form>

              {/* FOOTER ACTIONS */}
              <div
                style={{
                  marginTop: '24px',
                  paddingTop: '16px',
                  borderTop: '1px solid #e2e8f0',
                  textAlign: 'center',
                  fontSize: '13.5px',
                  color: '#64748b',
                }}
              >
                {selectedRole === 'guest' ? (
                  <div>
                    Need a guest account?{' '}
                    <a
                      href="#signup"
                      style={{ color: '#c49a1a', fontWeight: 700 }}
                      onClick={(e) => {
                        e.preventDefault();
                        setIsGuestSignup(true);
                      }}
                    >
                      Create Free Guest Account
                    </a>
                  </div>
                ) : selectedRole === 'owner' ? (
                  <div>
                    Want to list your PG property?{' '}
                    <a
                      href="#contact"
                      style={{ color: '#c49a1a', fontWeight: 700 }}
                      onClick={(e) => {
                        e.preventDefault();
                        alert('To register your PG property, please contact the admin team or use the Owner onboarding flow.');
                      }}
                    >
                      Register New PG Property
                    </a>
                  </div>
                ) : (
                  <div>
                    Need help logging in?{' '}
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#c49a1a',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                      onClick={() => handleAutofill(selectedRole)}
                    >
                      Autofill Demo Credentials
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
