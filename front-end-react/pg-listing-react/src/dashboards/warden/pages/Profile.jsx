import React, { useEffect, useState } from 'react';
import useScreenState from '../../../app/useScreenState';
import { useDispatch, useSelector } from 'react-redux';
import Modal from '../components/Modal';
import { changeMyPassword, refreshProfile, selectCurrentUser, updateMyProfile } from '../../../features/auth/authSlice';
import { selectWarden } from '../../../features/warden/wardenSlices';
import { useWardenRun, useWardenToast } from '../utils/dataStore';

export default function Profile() {
  const dispatch = useDispatch();
  const run = useWardenRun();
  const user = useSelector(selectCurrentUser) || {};
  const loading = useSelector((s) => s.auth.profileStatus === 'loading') && !user.name;
  const { rooms } = useSelector(selectWarden);
  const property = [...new Set(rooms.map((r) => r.property).filter(Boolean))].join(', ') || user.region || 'Not assigned';
  const [saving, setSaving] = useScreenState(false);

  // Only the fields the user has edited; everything else shows the stored value.
  const [edits, setEdits] = useScreenState({});
  const { name, email, phone, address } = {
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    address: user.address || '',
    ...edits,
  };
  const edit = (key) => (e) => setEdits((prev) => ({ ...prev, [key]: e.target.value }));

  useEffect(() => {
    dispatch(refreshProfile());
  }, [dispatch]);

  // Password Modal State
  const [isPwdModalOpen, setIsPwdModalOpen] = useScreenState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdErrors, setPwdErrors] = useScreenState({});

  const showToast = useWardenToast();

  const handleSaveProfile = async () => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      showToast('error', 'Validation Error', 'Please fill all required fields');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showToast('error', 'Invalid Email', 'Please enter a valid email address');
      return;
    }
    if (!/^\+?[\d\s-]{9,}$/.test(phone.trim())) {
      showToast('error', 'Invalid Phone', 'Please enter a valid phone number');
      return;
    }

    setSaving(true);
    try {
      await run(updateMyProfile({ name: name.trim(), email: email.trim(), phone: phone.trim(), address: address.trim() }));
      setEdits({});
      showToast('success', 'Profile saved');
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

    try {
      await run(changeMyPassword({ currentPassword: currentPwd, newPassword: newPwd }));
      setIsPwdModalOpen(false);
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setPwdErrors({});
      showToast('success', 'Password updated');
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
            <div className="profile-meta-row"><span>Joined</span><span>{user.joinDate || '—'}</span></div>
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
                <input type="text" value={name} onChange={edit('name')} placeholder="Full Name" />
              </div>
              <div className="form-field">
                <label>Email Address *</label>
                <input type="email" value={email} onChange={edit('email')} placeholder="Email" />
              </div>
              <div className="form-field">
                <label>Phone Number *</label>
                <input type="tel" value={phone} onChange={edit('phone')} placeholder="Phone" />
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
                  onChange={edit('address')} 
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

    </section>
  );
}
