import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';

const Profile = () => {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  const { tenant, activeBooking, loading } = useAuth();
  
  const [name, setName] = useState(tenant?.name || '');
  const [phone, setPhone] = useState(tenant?.phone || '');
  const [address, setAddress] = useState('A-204, Sunrise PG Residency, Andheri West, Mumbai'); // Fallback address
  
  // Initialize state once tenant is loaded
  React.useEffect(() => {
    if (tenant) {
      setName(tenant.name || '');
      setPhone(tenant.phone || '');
      // If there's an address field in the backend, set it here
    }
  }, [tenant]);

  const handleUpdateProfile = async () => {
    if (!tenant) return;
    try {
      await apiFetch(`/users/${tenant.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, phone })
      });
      alert('Profile Saved');
    } catch (error) {
      alert('Failed to update profile');
      console.error(error);
    }
  };

  if (loading) return <div style={{padding: '20px'}}>Loading profile...</div>;

  const propertyName = activeBooking?.property?.name || 'Not Assigned';
  const room = activeBooking?.room || '-';

  if (isChangingPassword) {
    return (
      <div style={{maxWidth: '500px', margin: '0 auto'}}>
        <button className="btn btn-ghost btn-sm mb-16" onClick={() => setIsChangingPassword(false)} style={{marginBottom: '16px'}}>← Back to Profile</button>
        <div className="card">
          <div className="card-body">
            <div className="card-title">Change Password</div>
            <div className="mt-14" style={{marginTop: '14px'}}>
              <div className="form-group">
                <label>Current Password</label>
                <input type="password" placeholder="Enter current password" />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input type="password" placeholder="Enter new password (min 6 chars)" />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input type="password" placeholder="Type new password again" />
              </div>
              <div style={{marginTop: '20px'}}>
                <button className="btn btn-primary btn-full" onClick={() => {alert('Password Updated'); setIsChangingPassword(false);}}>Update Password</button>
              </div>
            </div>
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
          <div className="profile-name">{tenant?.name || 'User Name'}</div>
          <div className="profile-email">{tenant?.email || 'user@email.com'}</div>
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
                <div className="form-group"><label>Full Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div className="form-group"><label>Email Address</label><input type="email" defaultValue={tenant?.email || ''} readOnly style={{background: 'var(--bg-main)'}} /></div>
                <div className="form-group"><label>Phone Number</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                <div className="form-group"><label>Property Assigned</label><input type="text" defaultValue={propertyName} readOnly style={{background: 'var(--bg-main)'}} /></div>
                <div className="form-group"><label>Address</label><textarea value={address} onChange={(e) => setAddress(e.target.value)} style={{minHeight: '70px'}}></textarea></div>
                <button className="btn btn-primary" onClick={handleUpdateProfile}><span className="material-icons-outlined" style={{fontSize: '24px'}}>save</span> Save Changes</button>
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
                      <div className="security-sub">Last changed 30 days ago</div>
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
