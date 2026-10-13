import { useEffect, useState } from 'react';
import { api } from '../services/api';

const fieldStyle = { width: '100%', padding: 10, borderRadius: 6, border: '1px solid #cbd5e1' };
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 };

export default function Profile({ user, setUser, users, refresh, showToast }) {
  // The shared login stores email but not always an ID.
  const admin = users.find(person =>
    (user.id && person.id === user.id) || (user.email && person.email === user.email)
  ) || user;
  const [details, setDetails] = useState({ name: admin.name || 'Super Admin', email: admin.email || 'admin@pgrentals.com', phone: admin.phone || '+91 00000 00000' });
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' });
  const [twoFA, setTwoFA] = useState(localStorage.getItem('super_admin_2fa_enabled') === 'true');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDetails({ name: admin.name || 'Super Admin', email: admin.email || 'admin@pgrentals.com', phone: admin.phone || '+91 00000 00000' }); }, [admin.id, admin.name, admin.email, admin.phone]);

  async function updateDetails() {
    if (!details.name.trim() || !details.email.trim()) { showToast('error', 'Required', 'Name and email cannot be empty.'); return; }
    if (!/^\+?[\d\s-]{9,}$/.test(details.phone.trim())) { showToast('error', 'Invalid Phone', 'Please enter a valid phone number.'); return; }
    if (!admin.id) { showToast('error', 'Error', 'Your account was not found on the server.'); return; }
    setSaving(true);
    try {
      await api.updateUser(admin.id, { name: details.name.trim(), email: details.email.trim(), phone: details.phone.trim() });
      const updated = { ...user, ...details };
      sessionStorage.setItem('pg_user', JSON.stringify(updated));
      setUser(updated);
      await refresh();
      showToast('success', 'Profile Updated', 'Your personal details have been saved.');
    } catch (error) { showToast('error', 'Error', error.message); }
    finally { setSaving(false); }
  }

  function updatePassword() {
    if (!password.current || !password.next || password.next.length < 6 || password.next !== password.confirm) {
      showToast('error', 'Password', 'Enter your current password and a matching new password of at least 6 characters.');
      return;
    }
    // The backend has no verified password-change endpoint. Do not claim that it was changed.
    showToast('error', 'Password', 'Password changes need a backend endpoint that verifies your current password.');
  }

  function toggle2FA(enabled) {
    setTwoFA(enabled);
    localStorage.setItem('super_admin_2fa_enabled', String(enabled));
    showToast('info', '2FA Preference', 'Preference saved locally. Two-factor sign-in needs backend support.');
  }

  return <section id="profile-sec" className="section active">
    <div className="sec-hdr"><h2>Profile</h2><p>Manage your account security and preferences</p></div>
    <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', padding: 24, marginBottom: 24, maxWidth: 800 }}>
      <div className="profile-avatar-wrap" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div className="profile-avatar-circle" style={{ width: 64, height: 64, borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 'bold' }}>A</div>
        <div><strong style={{ fontSize: 18, display: 'block' }}>{admin.name || 'Super Admin'}</strong><div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>{admin.email || 'admin@pgrentals.com'}</div><span className="badge badge-admin" style={{ marginTop: 8, display: 'inline-flex', padding: '4px 8px', background: '#eff6ff', color: '#1d4ed8', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>Super Administrator</span></div>
      </div>
      <div className="profile-meta-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid #e2e8f0' }}>
        <div className="profile-meta-item"><span style={{ display: 'block', fontSize: 12, color: '#64748b' }}>Role</span><strong style={{ fontSize: 14 }}>Super Admin</strong></div>
        <div className="profile-meta-item"><span style={{ display: 'block', fontSize: 12, color: '#64748b' }}>Last Login</span><strong style={{ fontSize: 14 }}>Today at 10:45 AM</strong></div>
        <div className="profile-meta-item"><span style={{ display: 'block', fontSize: 12, color: '#64748b' }}>Status</span><strong style={{ fontSize: 14, color: '#16a34a' }}>Active</strong></div>
      </div>
      <h4 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><span className="material-icons-outlined">manage_accounts</span> Personal Information</h4>
      <div style={{ display: 'grid', gap: 16, maxWidth: 400, marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid #e2e8f0' }}>
        {[['name', 'Full Name', 'text'], ['email', 'Email Address', 'email'], ['phone', 'Phone Number', 'text']].map(([key, label, type]) => <div key={key}><label style={labelStyle}>{label}</label><input style={fieldStyle} type={type} value={details[key]} onChange={event => setDetails({ ...details, [key]: event.target.value })} /></div>)}
        <button className="btn-confirm-blue" style={{ padding: '10px 16px', marginTop: 8 }} disabled={saving} onClick={updateDetails}>{saving ? 'Saving...' : 'Update Details'}</button>
      </div>
      <h4 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><span className="material-icons-outlined">lock</span> Security Settings</h4>
      <div style={{ display: 'grid', gap: 16, maxWidth: 400, marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid #e2e8f0' }}>
        {[['current', 'Current Password'], ['next', 'New Password'], ['confirm', 'Confirm New Password']].map(([key, label]) => <div key={key}><label style={labelStyle}>{label}</label><input style={fieldStyle} type="password" value={password[key]} onChange={event => setPassword({ ...password, [key]: event.target.value })} placeholder={key === 'next' ? 'Min 6 characters' : `Enter ${label.toLowerCase()}`} /></div>)}
        <button className="btn-confirm-blue" style={{ padding: '10px 16px', marginTop: 8 }} onClick={updatePassword}>Update Password</button>
      </div>
      <h4 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><span className="material-icons-outlined">security</span> System Security</h4>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 32 }}>
        <div><strong style={{ fontSize: 14, display: 'block' }}>Two-Factor Authentication (2FA)</strong><span style={{ fontSize: 13, color: '#64748b' }}>Add an extra layer of security</span></div>
        <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: 44, height: 24 }}><input type="checkbox" checked={twoFA} onChange={event => toggle2FA(event.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} /><span className="toggle-slider" style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#cbd5e1', transition: '.4s', borderRadius: 34 }} /></label>
      </div>
    </div>
  </section>;
}
