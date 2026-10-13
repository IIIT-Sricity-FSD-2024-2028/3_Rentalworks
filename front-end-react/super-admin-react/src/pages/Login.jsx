import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function Login({ onLogin }) {
  const [selected, setSelected] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Load the unchanged login stylesheet only while this screen is visible.
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = `${import.meta.env.BASE_URL}login.css`;
    document.head.appendChild(link);
    return () => link.remove();
  }, []);

  async function signIn(event) {
    event.preventDefault();
    if (!username.trim() || !password) { setError('Enter your username and password.'); return; }
    setLoading(true); setError('');
    try {
      const user = await api.login(username.trim(), password, otp.trim());
      if (user.role !== 'super_admin') throw new Error('This portal is for super admins only.');
      if (!user.token) throw new Error('The server did not issue a super admin session.');
      sessionStorage.setItem('super_admin_token', user.token);
      sessionStorage.setItem('pg_user', JSON.stringify(user));
      onLogin(user);
    } catch (failure) { setError(failure.message); }
    finally { setLoading(false); }
  }

  return <div className="main-container">
    <div className="top-header"><div className="brand-logo"><span className="brand-icon"><span className="material-icons-outlined" style={{ fontSize: 32 }}>apartment</span></span><span className="brand-name">RentBro</span></div><h1 className="brand-headline">Smart PG Management System</h1></div>
    <div className="card-panel"><div className="card-panel-inner">
      {selected && <button className="back-btn" onClick={() => { setSelected(false); setError(''); }}>← Back to Roles</button>}
      {!selected ? <div className="card role-card"><div className="role-layout"><div className="role-layout-text"><h2 className="card-title">Select Your Role</h2></div><div className="role-grid">
        {['Super Admin', 'Admin', 'Tenant', 'Guest', 'Owner', 'Warden'].map(role => <button key={role} className="role-btn" onClick={() => {
          if (role === 'Super Admin') setSelected(true);
          else window.location.href = import.meta.env.VITE_SHARED_LOGIN_URL || '../../../../front-end/login/login/login.html';
        }}><div className="role-initial">{role[0]}</div>{role}</button>)}
      </div></div></div> : <div className="card login-card" style={{ display: 'block' }}><h2 className="card-title">Super Admin Login</h2><p className="card-sub">Global system administration access</p>
        {error && <div className="login-banner" style={{ display: 'block' }} role="alert">{error}</div>}
        <form onSubmit={signIn}><div className="form-field"><label>Username</label><div className="inp-wrap"><span className="inp-ico"><span className="material-icons-outlined" style={{ fontSize: 20 }}>person</span></span><input value={username} onChange={event => setUsername(event.target.value)} placeholder="Enter your username" /></div></div>
          <div className="form-field"><label>Password</label><div className="inp-wrap"><span className="inp-ico"><span className="material-icons-outlined" style={{ fontSize: 20 }}>lock</span></span><input type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your password" /><span className="toggle-pw" onClick={() => setShowPassword(!showPassword)}><span className="material-icons-outlined" style={{ fontSize: 24 }}>{showPassword ? 'visibility_off' : 'visibility'}</span></span></div></div>
          <div className="form-field"><label>Authenticator Code (if enabled)</label><div className="inp-wrap"><span className="inp-ico"><span className="material-icons-outlined" style={{ fontSize: 20 }}>security</span></span><input inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={event => setOtp(event.target.value)} placeholder="6-digit code" /></div></div>
          <button type="submit" className="btn-login" disabled={loading}>{loading ? 'Signing In...' : 'Sign In'}</button>
        </form>
      </div>}
      {!selected && error && <div className="login-banner" style={{ display: 'block' }} role="alert">{error}</div>}
    </div></div>
  </div>;
}
