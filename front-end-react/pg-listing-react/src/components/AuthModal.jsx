import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBooking } from '../context/BookingContext';

export default function AuthModal() {
  const { authModalOpen, setAuthModalOpen, guestLogin, registerGuest, authModalCallback } = useAuth();
  const { selectedPG } = useBooking();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'

  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    gender: 'male',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!authModalOpen) return null;

  const handleClose = () => {
    setError('');
    setAuthModalOpen(false);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginForm.identifier.trim() || !loginForm.password) {
      setError('Please enter your email/username and password');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const user = await guestLogin(loginForm.identifier.trim(), loginForm.password);
      setAuthModalOpen(false);
      if (typeof authModalCallback === 'function') {
        authModalCallback(user);
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!signupForm.name.trim() || !signupForm.email.trim() || !signupForm.phone.trim()) {
      setError('Please provide Name, Email, and Phone number');
      return;
    }
    if (!signupForm.gender) {
      setError('Please select your gender');
      return;
    }
    if (!signupForm.password || signupForm.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const user = await registerGuest({
        name: signupForm.name.trim(),
        email: signupForm.email.trim(),
        phone: signupForm.phone.trim(),
        gender: signupForm.gender,
        password: signupForm.password,
      });
      setAuthModalOpen(false);
      if (typeof authModalCallback === 'function') {
        authModalCallback(user);
      }
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={handleClose} aria-label="Close">
          ✕
        </button>

        <div className="auth-modal-header">
          <div className="auth-logo-badge">
            <span className="material-icons-outlined" style={{ fontSize: '30px', color: '#ca8a04' }}>
              badge
            </span>
          </div>
          <h2>Guest Booking Authentication</h2>
          <p>
            {selectedPG?.title ? (
              <span>Continuing reservation for <strong>{selectedPG.title}</strong></span>
            ) : (
              <span>Sign in or create a guest profile to proceed with room reservation.</span>
            )}
          </p>
        </div>

        <div className="auth-modal-tabs">
          <button
            className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
            type="button"
          >
            Guest Sign In
          </button>
          <button
            className={`auth-tab-btn ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => { setMode('signup'); setError(''); }}
            type="button"
          >
            Quick Guest Sign Up
          </button>
        </div>

        {error && (
          <div className="auth-error-banner" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 14px', borderRadius: '8px', fontSize: '13.5px', marginBottom: '16px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span className="material-icons-outlined" style={{ fontSize: '18px', flexShrink: 0, marginTop: '2px' }}>error_outline</span>
            <span>{error}</span>
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="auth-modal-form">
            <div className="form-field">
              <label>Email / Phone / Username</label>
              <div className="input-box">
                <span className="material-icons-outlined">mail_outline</span>
                <input
                  type="text"
                  placeholder="e.g. testguest@example.com or tenant1"
                  value={loginForm.identifier}
                  onChange={(e) => setLoginForm({ ...loginForm, identifier: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-field">
              <label>Password</label>
              <div className="input-box">
                <span className="material-icons-outlined">lock_outline</span>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-auth-submit" disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In & Continue Booking →'}
            </button>

            <div className="auth-helper-note" style={{ fontSize: '12px', color: '#64748b', marginTop: '12px', textAlign: 'center' }}>
              <span>Guests &amp; Tenants only. Management accounts (Admin/Owner/Warden) use Portal Login.</span>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSignupSubmit} className="auth-modal-form">
            <div className="form-field">
              <label>Full Name *</label>
              <div className="input-box">
                <span className="material-icons-outlined">person_outline</span>
                <input
                  type="text"
                  placeholder="e.g. Rohit Kumar"
                  value={signupForm.name}
                  onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-field">
                <label>Email Address *</label>
                <div className="input-box">
                  <span className="material-icons-outlined">mail_outline</span>
                  <input
                    type="email"
                    placeholder="rohit@example.com"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Phone Number *</label>
                <div className="input-box">
                  <span className="material-icons-outlined">phone</span>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={signupForm.phone}
                    onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-field">
              <label>Gender * (Required for PG Booking Eligibility)</label>
              <div className="input-box" style={{ padding: '4px 12px' }}>
                <span className="material-icons-outlined" style={{ color: '#ca8a04' }}>wc</span>
                <select
                  value={signupForm.gender}
                  onChange={(e) => setSignupForm({ ...signupForm, gender: e.target.value })}
                  required
                  style={{ width: '100%', height: '42px', border: 'none', background: 'transparent', outline: 'none', fontSize: '14px', color: '#1e293b', cursor: 'pointer' }}
                >
                  <option value="male">Male (Eligible for Boys &amp; Co-ed PGs)</option>
                  <option value="female">Female (Eligible for Girls &amp; Co-ed PGs)</option>
                  <option value="other">Other (Eligible for Co-ed PGs)</option>
                </select>
              </div>
            </div>

            <div className="form-field">
              <label>Create Password *</label>
              <div className="input-box">
                <span className="material-icons-outlined">vpn_key</span>
                <input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={signupForm.password}
                  onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-auth-submit" disabled={loading}>
              {loading ? 'Creating Profile...' : 'Complete Sign Up & Continue Booking →'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
