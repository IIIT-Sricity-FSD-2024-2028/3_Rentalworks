import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!username || !password) { setError('Please enter username and password'); return; }
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) { setError('Invalid credentials'); setLoading(false); return; }
      const user = await res.json();
      if (user.role !== 'admin') { setError('Access denied. Admin accounts only.'); setLoading(false); return; }
      login(user);
      navigate('/');
    } catch { setError('Cannot connect to server. Is the backend running?'); }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-wrap">
        <div className="login-brand">
          <div className="brand-logo"><span className="material-icons-outlined" style={{fontSize:24}}>apartment</span> RentBro</div>
          <h1>Admin <em>Portal</em></h1>
          <p>Manage your PG properties, tenants, and platform operations from one centralized dashboard.</p>
        </div>
        <div className="login-card">
          <h2>Admin Sign In</h2>
          {error && <div className="err-banner show">{error}</div>}
          <form onSubmit={handleLogin}>
            <div className="form-grp">
              <label>Username</label>
              <div className="inp-wrap">
                <span className="ico material-icons-outlined">person</span>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" />
              </div>
            </div>
            <div className="form-grp">
              <label>Password</label>
              <div className="inp-wrap">
                <span className="ico material-icons-outlined">lock</span>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" />
              </div>
            </div>
            <button type="submit" className="btn-login" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
