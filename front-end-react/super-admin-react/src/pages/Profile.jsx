import { useEffect, useState } from 'react';
import { api } from '../services/api';

const fieldStyle = { width: '100%', padding: 10, borderRadius: 6, border: '1px solid #cbd5e1' };
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 };

export default function Profile({ user, setUser, showToast }) {
  const [admin, setAdmin] = useState(user);
  const [details, setDetails] = useState({ name: user.name || '', email: user.email || '', phone: user.phone || '' });
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' });
  const [twoFA, setTwoFA] = useState(Boolean(user.twoFactorEnabled));
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState('');
  const [changingTwoFA, setChangingTwoFA] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.profile().then(profile => {
      setAdmin(profile);
      setDetails({ name: profile.name, email: profile.email, phone: profile.phone });
      setTwoFA(profile.twoFactorEnabled);
    }).catch(error => showToast('error', 'Profile', error.message));
  }, []);

  async function updateDetails() {
    if (!details.name.trim() || !details.email.trim()) { showToast('error', 'Required', 'Name and email cannot be empty.'); return; }
    if (details.phone.trim() && !/^\+?[\d\s-]{9,}$/.test(details.phone.trim())) { showToast('error', 'Invalid Phone', 'Please enter a valid phone number.'); return; }
    setSaving(true);
    try {
      const profile = await api.updateProfile({ name: details.name.trim(), email: details.email.trim(), phone: details.phone.trim() });
      const updated = Object.assign({}, user, profile);
      sessionStorage.setItem('pg_user', JSON.stringify(updated));
      setUser(updated);
      setAdmin(profile);
      showToast('success', 'Profile Updated', 'Your personal details have been saved.');
    } catch (error) { showToast('error', 'Error', error.message); }
    finally { setSaving(false); }
  }

  async function updatePassword() {
    if (!password.current || !password.next || password.next.length < 6 || password.next !== password.confirm) {
      showToast('error', 'Password', 'Enter your current password and a matching new password of at least 6 characters.');
      return;
    }
    setSaving(true);
    try {
      await api.changePassword({ currentPassword: password.current, newPassword: password.next });
      setPassword({ current: '', next: '', confirm: '' });
      showToast('success', 'Password Updated', 'Your password has been changed.');
    } catch (error) { showToast('error', 'Password', error.message); }
    finally { setSaving(false); }
  }

  async function toggle2FA(enabled) {
    setChangingTwoFA(true);
    try {
      if (enabled) setSetup(await api.setupTwoFactor());
      else setSetup({ disable: true });
      setCode('');
    } catch (error) { showToast('error', 'Two-Factor Authentication', error.message); }
    finally { setChangingTwoFA(false); }
  }

  async function saveTwoFA() {
    setChangingTwoFA(true);
    try {
      if (setup.disable) await api.disableTwoFactor(code.trim());
      else await api.confirmTwoFactor(code.trim());
      setTwoFA(!setup.disable);
      setSetup(null);
      setCode('');
      showToast('success', 'Two-Factor Authentication', setup.disable ? 'Disabled.' : 'Enabled. Use your authenticator code at sign-in.');
    } catch (error) { showToast('error', 'Two-Factor Authentication', error.message); }
    finally { setChangingTwoFA(false); }
  }

  return <section id="profile-sec" className="section active">
    <div className="sec-hdr"><h2>Profile</h2><p>Manage your account security and preferences</p></div>
    <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', padding: 24, marginBottom: 24, maxWidth: 800 }}>
      <div className="profile-avatar-wrap" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div className="profile-avatar-circle" style={{ width: 64, height: 64, borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 'bold' }}>A</div>
        <div><strong style={{ fontSize: 18, display: 'block' }}>{admin.name}</strong><div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>{admin.email}</div><span className="badge badge-admin" style={{ marginTop: 8, display: 'inline-flex', padding: '4px 8px', background: '#eff6ff', color: '#1d4ed8', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>Super Administrator</span></div>
      </div>
      <div className="profile-meta-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid #e2e8f0' }}>
        <div className="profile-meta-item"><span style={{ display: 'block', fontSize: 12, color: '#64748b' }}>Role</span><strong style={{ fontSize: 14 }}>Super Admin</strong></div>
        <div className="profile-meta-item"><span style={{ display: 'block', fontSize: 12, color: '#64748b' }}>Email</span><strong style={{ fontSize: 14 }}>{admin.email}</strong></div>
        <div className="profile-meta-item"><span style={{ display: 'block', fontSize: 12, color: '#64748b' }}>Status</span><strong style={{ fontSize: 14, color: '#16a34a' }}>{admin.status}</strong></div>
      </div>
      <h4 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><span className="material-icons-outlined">manage_accounts</span> Personal Information</h4>
      <div style={{ display: 'grid', gap: 16, maxWidth: 400, marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid #e2e8f0' }}>
        {[['name', 'Full Name', 'text'], ['email', 'Email Address', 'email'], ['phone', 'Phone Number', 'text']].map(([key, label, type]) => <div key={key}><label style={labelStyle}>{label}</label><input style={fieldStyle} type={type} value={details[key]} onChange={event => setDetails(Object.assign({}, details, { [key]: event.target.value }))} /></div>)}
        <button className="btn-confirm-blue" style={{ padding: '10px 16px', marginTop: 8 }} disabled={saving} onClick={updateDetails}>{saving ? 'Saving...' : 'Update Details'}</button>
      </div>
      <h4 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><span className="material-icons-outlined">lock</span> Security Settings</h4>
      <div style={{ display: 'grid', gap: 16, maxWidth: 400, marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid #e2e8f0' }}>
        {[['current', 'Current Password'], ['next', 'New Password'], ['confirm', 'Confirm New Password']].map(([key, label]) => <div key={key}><label style={labelStyle}>{label}</label><input style={fieldStyle} type="password" value={password[key]} onChange={event => setPassword(Object.assign({}, password, { [key]: event.target.value }))} placeholder={key === 'next' ? 'Min 6 characters' : `Enter ${label.toLowerCase()}`} /></div>)}
        <button className="btn-confirm-blue" style={{ padding: '10px 16px', marginTop: 8 }} disabled={saving} onClick={updatePassword}>Update Password</button>
      </div>
      <h4 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><span className="material-icons-outlined">security</span> System Security</h4>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 32 }}>
        <div><strong style={{ fontSize: 14, display: 'block' }}>Two-Factor Authentication (2FA)</strong><span style={{ fontSize: 13, color: '#64748b' }}>Add an extra layer of security</span></div>
        <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: 44, height: 24 }}><input type="checkbox" checked={twoFA} disabled={changingTwoFA} onChange={event => toggle2FA(event.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} /><span className="toggle-slider" style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#cbd5e1', transition: '.4s', borderRadius: 34 }} /></label>
      </div>
      {setup && <div style={{ display: 'grid', gap: 10, maxWidth: 400 }}>
        <p>{setup.disable ? 'Enter your current authenticator code to disable 2FA.' : 'Add this key to your authenticator app, then enter its current code.'}</p>
        {!setup.disable && <code style={{ overflowWrap: 'anywhere' }}>{setup.secret}</code>}
        <input style={fieldStyle} inputMode="numeric" value={code} onChange={event => setCode(event.target.value)} placeholder="6-digit authenticator code" />
        <button className="btn-confirm-blue" disabled={changingTwoFA} onClick={saveTwoFA}>{setup.disable ? 'Disable 2FA' : 'Confirm 2FA'}</button>
      </div>}
    </div>
  </section>;
}
