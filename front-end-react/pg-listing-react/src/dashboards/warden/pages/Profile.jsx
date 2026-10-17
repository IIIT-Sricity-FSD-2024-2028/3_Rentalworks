import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { getUserProfileApi, updateUserProfileApi } from '../utils/api';

export default function Profile() {
  const [user, setUser] = useState({});
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [property, setProperty] = useState('Green Nest PG');
  const [address, setAddress] = useState('');

  // Password Modal State
  const [isPwdModalOpen, setIsPwdModalOpen] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdErrors, setPwdErrors] = useState({});

  const showToast = (type, title, message) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      // Identify authenticated user from session or default warden ID 9 in Neon
      const sessionUser = JSON.parse(sessionStorage.getItem('warden_user')) || 
                          JSON.parse(sessionStorage.getItem('pg_user')) || 
                          { id: 9, role: 'warden', username: 'warden' };
      const userId = sessionUser.id || 9;

      try {
        const liveUser = await getUserProfileApi(userId);
        setUser(liveUser);
        setName(liveUser.name || '');
        setEmail(liveUser.email || '');
        setPhone(liveUser.phone || '');
        setAddress(liveUser.address || '');
        setProperty(sessionUser.property || 'Green Nest PG');

        // Sync session storage with live Neon DB record
        const updatedSession = { ...sessionUser, ...liveUser };
        sessionStorage.setItem('warden_user', JSON.stringify(updatedSession));
        if (sessionStorage.getItem('pg_user')) {
          sessionStorage.setItem('pg_user', JSON.stringify(updatedSession));
        }
      } catch (err) {
        console.warn('Could not load profile from backend, using session cache:', err);
        setUser(sessionUser);
        setName(sessionUser.name || 'Warden Officer');
        setEmail(sessionUser.email || 'warden@pgrentals.com');
        setPhone(sessionUser.phone || '+91 98765 00007');
        setAddress(sessionUser.address || '123 Main Street, Mumbai');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSaveProfile = async () => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      showToast('error', 'Validation Error', 'Please fill all required fields');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showToast('error', 'Invalid Email', 'Please enter a valid email address');
      return;
    }
    if (!/^\+?[\d\s\-]{9,}$/.test(phone.trim())) {
      showToast('error', 'Invalid Phone', 'Please enter a valid phone number');
      return;
    }

    const userId = user.id || 9;
    setSaving(true);
    try {
      const updatedUser = await updateUserProfileApi(userId, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
      });

      setUser(updatedUser);
      setName(updatedUser.name);
      setEmail(updatedUser.email);
      setPhone(updatedUser.phone);
      setAddress(updatedUser.address || '');

      // Update session storage
      const sessionUser = JSON.parse(sessionStorage.getItem('warden_user')) || {};
      const fullUser = { ...sessionUser, ...updatedUser };
      sessionStorage.setItem('warden_user', JSON.stringify(fullUser));
      if (sessionStorage.getItem('pg_user')) {
        sessionStorage.setItem('pg_user', JSON.stringify(fullUser));
      }

      showToast('success', 'Changes Saved', 'Changes saved');
    } catch (err) {
      showToast('error', 'Save Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    const errors = {};
    let valid = true;

    if (!currentPwd) {
      errors.current = 'Current password is required';
      valid = false;
    }

    if (!newPwd || newPwd.length < 8) {
      errors.new = 'Password must be at least 8 characters';
      valid = false;
    }

    if (newPwd !== confirmPwd) {
      errors.confirm = 'Passwords do not match';
      valid = false;
    }

    if (!valid) {
      setPwdErrors(errors);
      return;
    }

    const userId = user.id || 9;
    try {
      await updateUserProfileApi(userId, { password: newPwd });
      setIsPwdModalOpen(false);
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setPwdErrors({});
      showToast('success', 'Changes Saved', 'Changes saved');
    } catch (err) {
      showToast('error', 'Password Update Failed', err.message);
    }
  };

  const openPwdModal = () => {
    setIsPwdModalOpen(true);
    setCurrentPwd('');
    setNewPwd('');
    setConfirmPwd('');
    setPwdErrors({});
  };

  return (
    <section id="profile-section" className="section active">
      <div className="section-header">
        <h2>Profile Management</h2>
        <p>Manage your account information and preferences</p>
      </div>

      <div className="profile-layout">
        {/* Left Card */}
        <div className="profile-card">
          <div className="profile-avatar">{name ? name.charAt(0).toUpperCase() : 'W'}</div>
          <h3>{name}</h3>
          <p>{email}</p>
          <div className="profile-role-badge">Warden</div>
          <div className="profile-meta">
            <div className="profile-meta-row"><span>Property</span><span>{property}</span></div>
            <div className="profile-meta-row"><span>Joined</span><span>{user.joinDate || '1/15/2024'}</span></div>
            <div className="profile-meta-row"><span>Status</span><span style={{ color: '#16a34a' }}>Active</span></div>
          </div>
        </div>

        {/* Right Form */}
        <div className="profile-form-card">
          <h3>Personal Information</h3>
          {loading ? (
            <p style={{ color: '#6b7280', padding: '16px 0' }}>Loading profile...</p>
          ) : (
            <div className="form-grid">
              <div className="form-field">
                <label>Full Name *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" />
              </div>
              <div className="form-field">
                <label>Email Address *</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
              </div>
              <div className="form-field">
                <label>Phone Number *</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
              </div>
              <div className="form-field">
                <label>Property Assigned</label>
                <input type="text" value={property} readOnly placeholder="Property" />
              </div>
              <div className="form-field full">
                <label>Address</label>
                <input 
                  type="text" 
                  id="profile-address"
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)} 
                  placeholder="123 Main Street, Mumbai" 
                />
              </div>
            </div>
          )}
          <button className="btn-save" onClick={handleSaveProfile} disabled={saving}>
            <span className="material-icons-outlined" style={{ fontSize: '24px' }}>save</span> 
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Security */}
      <div className="security-card">
        <h3>Security</h3>
        <div className="security-row">
          <div className="sec-info">
            <strong>Password</strong>
            <span>Securely hashed and protected</span>
          </div>
          <button className="btn-change-password" onClick={openPwdModal}>Change Password</button>
        </div>
        <div className="security-row">
          <div className="sec-info">
            <strong>Two-Factor Authentication</strong>
            <span>Add an extra layer of security</span>
          </div>
          <button className="btn-enable-2fa" onClick={() => showToast('info', 'Coming Soon', '2FA will be available soon')}>Enable</button>
        </div>
      </div>

      {/* Password Modal */}
      <Modal 
        isOpen={isPwdModalOpen} 
        title="Change Password"
        onCancel={() => setIsPwdModalOpen(false)}
        onConfirm={handleChangePassword}
        confirmText="Update Password"
      >
        <div className="form-group">
          <label>Current Password *</label>
          <div className="input-wrapper">
            <input 
              type="password" 
              placeholder="Enter current password" 
              value={currentPwd}
              onChange={(e) => { setCurrentPwd(e.target.value); setPwdErrors(prev => ({ ...prev, current: null })); }}
            />
          </div>
          {pwdErrors.current && <div className="error-msg show">{pwdErrors.current}</div>}
        </div>
        <div className="form-group">
          <label>New Password *</label>
          <div className="input-wrapper">
            <input 
              type="password" 
              placeholder="Minimum 8 characters" 
              value={newPwd}
              onChange={(e) => { setNewPwd(e.target.value); setPwdErrors(prev => ({ ...prev, new: null })); }}
            />
          </div>
          {pwdErrors.new && <div className="error-msg show">{pwdErrors.new}</div>}
        </div>
        <div className="form-group">
          <label>Confirm New Password *</label>
          <div className="input-wrapper">
            <input 
              type="password" 
              placeholder="Re-enter new password" 
              value={confirmPwd}
              onChange={(e) => { setConfirmPwd(e.target.value); setPwdErrors(prev => ({ ...prev, confirm: null })); }}
            />
          </div>
          {pwdErrors.confirm && <div className="error-msg show">{pwdErrors.confirm}</div>}
        </div>
      </Modal>

      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type} show`}>
          <span className="toast-icon">
            <span className="material-icons-outlined" style={{ fontSize: '24px' }}>
              {toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'cancel' : 'info'}
            </span>
          </span>
          <div className="toast-text">
            <strong>{toast.title}</strong>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </section>
  );
}
