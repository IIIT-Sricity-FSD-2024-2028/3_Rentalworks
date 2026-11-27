import React, { useState } from 'react';
import useScreenState from '../../../app/useScreenState';
import { useDispatch } from 'react-redux';
import { runThunk } from '../../../app/hooks';
import { changeMyPassword, updateMyProfile } from '../../../features/auth/authSlice';
import { toastError } from '../../../features/ui/uiSlice';
import { useTenant } from '../hooks/useTenant';

const EMPTY_PASSWORDS = { current: '', next: '', confirm: '' };

const Profile = () => {
  const dispatch = useDispatch();
  const { tenant, activeBooking, loading } = useTenant();
  const [isChangingPassword, setIsChangingPassword] = useScreenState(false);
  const [saving, setSaving] = useScreenState(false);
  const [passwords, setPasswords] = useState(EMPTY_PASSWORDS);
  // Only the fields the user has edited; everything else shows the stored value.
  const [edits, setEdits] = useScreenState({});
  const { name, phone, address } = { name: tenant?.name || '', phone: tenant?.phone || '', address: tenant?.address || '', ...edits };
  const edit = (key) => (e) => setEdits((prev) => ({ ...prev, [key]: e.target.value }));
  const editPassword = (key) => (e) => setPasswords((prev) => ({ ...prev, [key]: e.target.value }));

  const handleUpdateProfile = async () => {
    if (!name.trim()) return dispatch(toastError('Full name is required'));
    if (!/^\+?[\d\s-]{9,}$/.test(phone.trim())) return dispatch(toastError('Enter a valid phone number'));
    setSaving(true);
    const { ok } = await runThunk(
      dispatch,
      updateMyProfile({ name: name.trim(), phone: phone.trim(), address: address.trim() }),
      { success: 'Profile saved' },
    );
    setSaving(false);
    if (ok) setEdits({});
  };

  const closePasswordForm = () => {
    setPasswords(EMPTY_PASSWORDS);
    setIsChangingPassword(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwords.current) return dispatch(toastError('Enter your current password'));
    if (passwords.next.length < 8) return dispatch(toastError('New password must be at least 8 characters'));
    if (passwords.next !== passwords.confirm) return dispatch(toastError('New passwords do not match'));
    setSaving(true);
    const { ok } = await runThunk(
      dispatch,
      changeMyPassword({ currentPassword: passwords.current, newPassword: passwords.next }),
      { success: 'Password updated' },
    );
    setSaving(false);
    if (ok) closePasswordForm();
  };

  if (loading) return <div style={{padding: '20px'}}>Loading profile...</div>;

  const propertyName = activeBooking?.property?.name || 'Not Assigned';
  const room = activeBooking?.room || '-';

  if (isChangingPassword) {
    return (
      <div style={{maxWidth: '500px', margin: '0 auto'}}>
        <button className="btn btn-ghost btn-sm mb-16" onClick={closePasswordForm} style={{marginBottom: '16px'}}>← Back to Profile</button>
        <div className="card">
          <div className="card-body">
            <div className="card-title">Change Password</div>
            <form className="mt-14" style={{marginTop: '14px'}} onSubmit={handleChangePassword}>
              <div className="form-group">
                <label>Current Password</label>
                <input type="password" autoComplete="current-password" placeholder="Enter current password" value={passwords.current} onChange={editPassword('current')} />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input type="password" autoComplete="new-password" placeholder="Enter new password (min 8 chars)" value={passwords.next} onChange={editPassword('next')} />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input type="password" autoComplete="new-password" placeholder="Type new password again" value={passwords.confirm} onChange={editPassword('confirm')} />
              </div>
              <div style={{marginTop: '20px'}}>
                <button type="submit" className="btn btn-primary btn-full" disabled={saving}>{saving ? 'Updating…' : 'Update Password'}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Profile</h1>
        <p>Manage your account information</p>
      </div>
      
      <div className="grid-2">
        <div className="profile-card">
          <div className="profile-avatar">{tenant?.name ? tenant.name.charAt(0).toUpperCase() : 'U'}</div>
          <div className="profile-name">{tenant?.name || '—'}</div>
          <div className="profile-email">{tenant?.email || '—'}</div>
          <span className="profile-badge">Tenant</span>
          <div className="profile-stats">
            <div className="profile-stat"><div className="profile-stat-label">Room Number</div><div className="profile-stat-value">{room}</div></div>
            <div className="profile-stat"><div className="profile-stat-label">Property</div><div className="profile-stat-value">{propertyName}</div></div>
          </div>
        </div>
        
        <div>
          <div className="card mb-16" style={{marginBottom: '16px'}}>
            <div className="card-body">
              <div className="card-title">Personal Information</div>
              <div className="mt-14" style={{marginTop: '14px'}}>
                <div className="form-group"><label>Full Name</label><input type="text" value={name} onChange={edit('name')} /></div>
                <div className="form-group"><label>Email Address</label><input type="email" value={tenant?.email || ''} readOnly style={{background: 'var(--bg-main)'}} /></div>
                <div className="form-group"><label>Phone Number</label><input type="tel" value={phone} onChange={edit('phone')} /></div>
                <div className="form-group"><label>Property Assigned</label><input type="text" value={propertyName} readOnly style={{background: 'var(--bg-main)'}} /></div>
                <div className="form-group"><label>Address</label><textarea value={address} onChange={edit('address')} style={{minHeight: '70px'}}></textarea></div>
                <button className="btn btn-primary" onClick={handleUpdateProfile} disabled={saving}><span className="material-icons-outlined" style={{fontSize: '24px'}}>save</span> Save Changes</button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="card-title">Security</div>
              <div className="mt-14" style={{marginTop: '14px'}}>
                <div className="security-item">
                  <div style={{display: 'flex', alignItems: 'center'}}>
                    <div className="security-icon" style={{background: 'var(--primary-bg)'}}><span className="material-icons-outlined" style={{fontSize: '24px'}}>vpn_key</span></div>
                    <div className="security-info">
                      <div className="security-title">Password</div>
                      <div className="security-sub">Securely hashed and protected</div>
                    </div>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => setIsChangingPassword(true)}>Change Password</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
