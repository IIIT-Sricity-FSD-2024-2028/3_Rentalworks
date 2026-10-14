import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal() {
  const { authModalOpen, setAuthModalOpen, login, registerGuest, authModalCallback } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'

  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' });
  const [signupForm, setSignupForm] = useState({ name: '', email: '', phone: '', password: '' });
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
      const user = await login(loginForm.identifier.trim(), loginForm.password);
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
              lock
            </span>
          </div>
          <h2>Guest Sign In Required</h2>
          <p>Please authenticate or create a quick guest account to proceed with your room reservation.</p>
        </div>

        <div className="auth-modal-tabs">
          <button
            className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
            type="button"
          >
            Sign In
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
          <div className="auth-error-banner">
            <span className="material-icons-outlined" style={{ fontSize: '18px' }}>error_outline</span>
            {error}
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
                  placeholder="e.g. guest@gmail.com or 9876543210"
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
              {loading ? 'Signing in...' : 'Sign In & Continue Booking →'}
            </button>

            <div className="auth-helper-note">
              <span>Demo Account: <code>tenant1</code> / <code>password123</code> or create a new guest account</span>
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
                  placeholder="e.g. Vikram Joshi"
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
                    placeholder="vikram@example.com"
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
              <label>Create Password (used for Tenant Dashboard) *</label>
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
              {loading ? 'Creating Guest Profile...' : 'Complete Sign Up & Reserve Room →'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
