import { useEffect, useState } from 'react';
import useScreenState from '../../../app/useScreenState';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSuperAdminProfile, updateSuperAdminProfile, changeSuperAdminPassword, selectSuperAdminProfile } from '../../../features/superadmin/superAdminSlice';

const fieldStyle = { width: '100%', padding: 10, borderRadius: 6, border: '1px solid #cbd5e1' };
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 };

export default function Profile({ user, showToast }) {
  const dispatch = useDispatch();
  const admin = useSelector(selectSuperAdminProfile) || user || {};
  const [edits, setEdits] = useScreenState({});
  const details = { name: admin.name || '', email: admin.email || '', phone: admin.phone || '', ...edits };
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' });
  const saving = useSelector((state) => state.superAdmin.saving);

  useEffect(() => {
    dispatch(fetchSuperAdminProfile()).unwrap().catch(error => showToast('error', 'Profile', error?.message || error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  async function updateDetails() {
    if (!details.name.trim() || !details.email.trim()) { showToast('error', 'Required', 'Name and email cannot be empty.'); return; }
    if (details.phone.trim() && !/^\+?[\d\s-]{9,}$/.test(details.phone.trim())) { showToast('error', 'Invalid Phone', 'Please enter a valid phone number.'); return; }
    try {
      await dispatch(updateSuperAdminProfile({ name: details.name.trim(), email: details.email.trim(), phone: details.phone.trim() })).unwrap();
      setEdits({});
      showToast('success', 'Profile Updated', 'Your personal details have been saved.');
    } catch (error) { showToast('error', 'Error', error?.message || error); }
  }

  async function updatePassword() {
    if (!password.current || !password.next || password.next.length < 6 || password.next !== password.confirm) {
      showToast('error', 'Password', 'Enter your current password and a matching new password of at least 6 characters.');
      return;
    }
    try {
      await dispatch(changeSuperAdminPassword({ currentPassword: password.current, newPassword: password.next })).unwrap();
      setPassword({ current: '', next: '', confirm: '' });
      showToast('success', 'Password Updated', 'Your password has been changed.');
    } catch (error) { showToast('error', 'Password', error?.message || error); }
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
        {[['name', 'Full Name', 'text'], ['email', 'Email Address', 'email'], ['phone', 'Phone Number', 'text']].map(([key, label, type]) => <div key={key}><label style={labelStyle}>{label}</label><input style={fieldStyle} type={type} value={details[key]} onChange={event => setEdits((previous) => ({ ...previous, [key]: event.target.value }))} /></div>)}
        <button className="btn-confirm-blue" style={{ padding: '10px 16px', marginTop: 8 }} disabled={saving} onClick={updateDetails}>{saving ? 'Saving...' : 'Update Details'}</button>
      </div>
      <h4 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><span className="material-icons-outlined">notifications</span> Notifications &amp; Platform Alerts</h4>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 24, maxWidth: 600 }}>
        <div>
          <strong style={{ display: 'block', fontSize: 14 }}>Broadcast &amp; Notifications Center</strong>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Manage platform-wide announcements, incoming alerts from owners and wardens, and priority notices.</p>
        </div>
        <a href="/dashboard/superadmin/notifications" className="btn-confirm-blue" style={{ textDecoration: 'none', padding: '8px 14px', fontSize: 13, whiteSpace: 'nowrap', display: 'inline-block' }}>
          Open Notifications
        </a>
      </div>

      <h4 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><span className="material-icons-outlined">lock</span> Security Settings</h4>
      <div style={{ display: 'grid', gap: 16, maxWidth: 400, marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid #e2e8f0' }}>
        {[['current', 'Current Password'], ['next', 'New Password'], ['confirm', 'Confirm New Password']].map(([key, label]) => <div key={key}><label style={labelStyle}>{label}</label><input style={fieldStyle} type="password" value={password[key]} onChange={event => setPassword(Object.assign({}, password, { [key]: event.target.value }))} placeholder={key === 'next' ? 'Min 6 characters' : `Enter ${label.toLowerCase()}`} /></div>)}
        <button className="btn-confirm-blue" style={{ padding: '10px 16px', marginTop: 8 }} disabled={saving} onClick={updatePassword}>Update Password</button>
      </div>
    </div>
  </section>;
}
