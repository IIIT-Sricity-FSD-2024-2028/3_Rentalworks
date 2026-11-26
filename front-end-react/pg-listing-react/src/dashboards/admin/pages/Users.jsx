import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { runThunk } from '../../../app/hooks';
import { adminUsers } from '../../../features/admin/adminSlices';
import { ROLE_HOME } from '../../../features/auth/authSlice';
import { useToast } from '../components/useToast';
import Modal from '../components/Modal';

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '');

// Every role an admin may create a login for. super_admin accounts are
// refused by the server, so they are not offered here.
const ROLE_OPTIONS = [
  { value: 'tenant', label: 'Tenant', dashboard: 'Tenant portal' },
  { value: 'owner', label: 'Owner', dashboard: 'Owner dashboard' },
  { value: 'warden', label: 'Warden', dashboard: 'Warden dashboard' },
  { value: 'admin', label: 'Admin', dashboard: 'Admin dashboard' },
  { value: 'guest', label: 'Guest', dashboard: 'Listings & booking only' },
];
const DASHBOARD_NAME = Object.fromEntries(ROLE_OPTIONS.map((r) => [r.value, r.dashboard]));
DASHBOARD_NAME.super_admin = 'Super admin dashboard';

const MIN_PASSWORD = 8;

/** 12-character password without look-alike characters (0/O, 1/l/I). */
function generatePassword() {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '@#$%&*!?'];
  const all = sets.join('');
  const rand = (n) => crypto.getRandomValues(new Uint32Array(1))[0] % n;
  const chars = sets.map((s) => s[rand(s.length)]); // at least one of each kind
  while (chars.length < 12) chars.push(all[rand(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

function passwordProblem(password, confirm) {
  if (password.length < MIN_PASSWORD) return `Password must be at least ${MIN_PASSWORD} characters`;
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Password must contain letters and numbers';
  if (confirm !== undefined && password !== confirm) return 'Passwords do not match';
  return '';
}

const canSignIn = (u) => u.status === 'active';

function passwordStrength(p) {
  if (!p) return { score: 0, label: '' };
  let score = 0;
  if (p.length >= MIN_PASSWORD) score++;
  if (p.length >= 12) score++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
  if (/\d/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  const level = score <= 2 ? 'weak' : score <= 3 ? 'fair' : 'strong';
  return { score, level, label: cap(level) };
}

function PasswordFields({ fields, onChange }) {
  const [show, setShow] = useState(false);
  const fill = () => {
    const p = generatePassword();
    onChange({ password: p, confirm: p });
    setShow(true);
  };
  const strength = passwordStrength(fields.password);
  const mismatch = fields.confirm && fields.confirm !== fields.password;
  return (
    <div className="pw-block">
      <div className="pw-field">
        <label htmlFor="pw-new">Password *</label>
        <div className="pw-input">
          <input
            id="pw-new"
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            value={fields.password}
            onChange={(e) => onChange({ password: e.target.value })}
            placeholder={`At least ${MIN_PASSWORD} characters`}
          />
          <button type="button" className="pw-eye" onClick={() => setShow((s) => !s)} title={show ? 'Hide password' : 'Show password'}>
            <span className="material-icons-outlined">{show ? 'visibility_off' : 'visibility'}</span>
          </button>
        </div>
        <div className="pw-tools">
          <div className={`pw-meter ${strength.level || ''}`}>
            <span style={{ width: `${(strength.score / 5) * 100}%` }} />
          </div>
          <span className="pw-meter-label">{strength.label || 'Letters and numbers'}</span>
          <button type="button" className="pw-generate" onClick={fill}>
            <span className="material-icons-outlined">auto_fix_high</span> Generate
          </button>
        </div>
      </div>
      <div className="pw-field">
        <label htmlFor="pw-confirm">Confirm password *</label>
        <div className="pw-input">
          <input
            id="pw-confirm"
            className={mismatch ? 'err' : ''}
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            value={fields.confirm}
            onChange={(e) => onChange({ confirm: e.target.value })}
            placeholder="Type it again"
          />
        </div>
        {mismatch && <div className="pw-hint err">Passwords do not match</div>}
      </div>
    </div>
  );
}

export default function Users() {
  const dispatch = useDispatch();
  const users = useSelector(adminUsers.selectors.selectItems);
  const loading = useSelector(adminUsers.selectors.selectIsLoading) && users.length === 0;
  const saving = useSelector(adminUsers.selectors.selectMutating);
  const [search, setSearch] = useState('');
  const [roleF, setRoleF] = useState('all');
  const [statusF, setStatusF] = useState('all');
  const [modal, setModal] = useState(null);
  const toast = useToast();

  useEffect(() => {
    dispatch(adminUsers.thunks.fetchAll());
  }, [dispatch]);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const ms = !search ||
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.phone?.includes(search);
    const mr = roleF === 'all' || u.role === roleF || (roleF === 'admin' && u.role === 'super_admin');
    const mst = statusF === 'all' || u.status === statusF;
    return ms && mr && mst;
  });

  const counts = {
    total: users.length,
    tenants: users.filter((u) => u.role === 'tenant').length,
    owners: users.filter((u) => u.role === 'owner').length,
    wardens: users.filter((u) => u.role === 'warden').length,
    admins: users.filter((u) => u.role === 'admin' || u.role === 'super_admin').length,
    canSignIn: users.filter(canSignIn).length,
  };

  const setFields = (patch) => setModal((m) => ({ ...m, fields: { ...m.fields, ...patch } }));

  const handleAdd = (role = 'tenant') => {
    setModal({
      type: 'add',
      title: 'Create Login',
      subtitle: 'The user signs in on the login page with their email and this password, and lands on their dashboard.',
      fields: { name: '', email: '', phone: '', role, password: '', confirm: '' },
    });
  };

  const handleEdit = (u) => {
    setModal({
      type: 'edit',
      title: 'Edit User',
      subtitle: 'Update user details',
      userId: u.id,
      fields: { name: u.name || '', email: u.email || '', phone: u.phone || '', role: u.role || 'tenant' },
    });
  };

  const handleView = (u) => setModal({ type: 'view', title: 'User Details', subtitle: u.email, user: u });

  const handleDelete = (u) => {
    setModal({
      type: 'confirm',
      title: 'Delete User',
      message: `Are you sure you want to permanently delete "${u.name}"? This action cannot be undone.`,
      userId: u.id,
      userName: u.name,
    });
  };

  const handleToggleSuspend = (u) => {
    const status = u.status === 'suspended' ? 'active' : 'suspended';
    runThunk(dispatch, adminUsers.thunks.updateItem({ id: u.id, changes: { status } }), {
      success: status === 'active' ? `${u.name} activated. They can sign in again.` : `${u.name} suspended. Their login is blocked.`,
    });
  };

  /** After creating a login: show the sign-in details once so the admin can hand them over. */
  const showLoginDetails = (user, password) => {
    setModal({ type: 'credentials', title: 'Login Ready', subtitle: 'Send these to the user now. The password is not shown again after you close this.', user, password });
  };

  const handleSave = async () => {
    if (!modal || saving) return;
    const f = modal.fields;
    const details = { name: f.name.trim(), email: f.email.trim().toLowerCase(), phone: f.phone.trim(), role: f.role };
    if (!details.name) { toast('error', 'Validation', 'Name is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) { toast('error', 'Validation', 'Enter a valid email'); return; }
    if (!details.phone) { toast('error', 'Validation', 'Phone number is required'); return; }
    const taken = users.find((u) => u.id !== modal.userId &&
      (u.email?.toLowerCase() === details.email || u.username?.toLowerCase() === details.email));
    if (taken) { toast('error', 'Validation', `${details.email} is already used by ${taken.name}`); return; }

    if (modal.type === 'add') {
      const problem = passwordProblem(f.password, f.confirm);
      if (problem) { toast('error', 'Validation', problem); return; }
      const { ok } = await runThunk(
        dispatch,
        adminUsers.thunks.createItem({ ...details, username: details.email, password: f.password }),
        { success: `Login created for ${details.name}` },
      );
      if (ok) showLoginDetails({ ...details, username: details.email }, f.password);
      return;
    }

    const { ok } = await runThunk(dispatch, adminUsers.thunks.updateItem({ id: modal.userId, changes: details }), { success: 'Changes saved' });
    if (ok) setModal(null);
  };

  const handleConfirmDelete = async () => {
    if (!modal || saving) return;
    const { ok } = await runThunk(dispatch, adminUsers.thunks.removeItem(modal.userId), { success: `${modal.userName} removed` });
    if (ok) setModal(null);
  };

  /** The message handed to the user. Same text for copy, email and WhatsApp. */
  const loginMessage = ({ user, password }) => [
    `Hi ${user.name || ''},`.trim(),
    '',
    `Your RentBro account is ready.`,
    `Login page: ${window.location.origin}/login`,
    `Email / username: ${user.username || user.email}`,
    `Password: ${password}`,
    `You will open: ${DASHBOARD_NAME[user.role] || cap(user.role)}`,
    '',
    'Please change this password from your Profile page after you sign in.',
  ].join('\n');

  const copyLoginDetails = async () => {
    try {
      await navigator.clipboard.writeText(loginMessage(modal));
      toast('success', 'Copied', 'Login details copied to clipboard');
    } catch {
      toast('error', 'Copy failed', 'Select the details and copy them manually');
    }
  };

  // Opens the admin's own mail app / WhatsApp with the message filled in.
  const emailLoginDetails = () => {
    const { user } = modal;
    const subject = encodeURIComponent('Your RentBro login details');
    window.location.href = `mailto:${encodeURIComponent(user.email || '')}?subject=${subject}&body=${encodeURIComponent(loginMessage(modal))}`;
  };

  const whatsappLoginDetails = () => {
    let digits = String(modal.user.phone || '').replace(/\D/g, '');
    if (digits.length === 10) digits = `91${digits}`; // Indian mobile without country code
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(loginMessage(modal))}`, '_blank', 'noopener');
  };

  const footer = (() => {
    switch (modal?.type) {
      case 'confirm':
        return (
          <>
            <button className="btn-cancel" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-confirm-red" onClick={handleConfirmDelete}>Delete User</button>
          </>
        );
      case 'view':
        return (
          <>
            <button className="btn-cancel" onClick={() => setModal(null)}>Close</button>
          </>
        );
      case 'credentials':
        return (
          <>
            <button className="btn-cancel" onClick={copyLoginDetails}>Copy</button>
            {modal.user.email && <button className="btn-cancel" onClick={emailLoginDetails}>Email</button>}
            {modal.user.phone && <button className="btn-cancel" onClick={whatsappLoginDetails}>WhatsApp</button>}
            <button className="btn-confirm-blue" onClick={() => setModal(null)}>Done</button>
          </>
        );
      default:
        return (
          <>
            <button className="btn-cancel" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-confirm-blue" onClick={handleSave} disabled={saving}>
              {modal?.type === 'add' ? 'Create Login' : 'Save Changes'}
            </button>
          </>
        );
    }
  })();

  return (
    <>
      <div className="sec-hdr">
        <h2>User Management</h2>
        <p>Create logins for every role and control who can sign in</p>
      </div>

      <div className="user-summary">
        <div className="u-sum-card">
          <div className="u-sum-label">Total Users</div>
          <div className="u-sum-val">{counts.total}</div>
        </div>
        <div className="u-sum-card">
          <div className="u-sum-label">Tenants</div>
          <div className="u-sum-val blue">{counts.tenants}</div>
        </div>
        <div className="u-sum-card">
          <div className="u-sum-label">Property Owners</div>
          <div className="u-sum-val purple">{counts.owners}</div>
        </div>
        <div className="u-sum-card">
          <div className="u-sum-label">Wardens</div>
          <div className="u-sum-val green">{counts.wardens}</div>
        </div>
        <div className="u-sum-card">
          <div className="u-sum-label">Admins</div>
          <div className="u-sum-val red">{counts.admins}</div>
        </div>
        <div className="u-sum-card">
          <div className="u-sum-label">Can Sign In</div>
          <div className="u-sum-val green">{counts.canSignIn}</div>
        </div>
      </div>

      {/* One-click login creation per dashboard */}
      <div className="tbl-wrap" style={{ marginBottom: 16 }}>
        <div className="tbl-hdr" style={{ flexWrap: 'wrap', gap: 8 }}>
          <strong style={{ fontSize: 13, marginRight: 8 }}>Create a login for:</strong>
          {ROLE_OPTIONS.map((r) => (
            <button key={r.value} className="btn-cancel" onClick={() => handleAdd(r.value)} title={`Opens: ${r.dashboard}`}>
              <span className="material-icons-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>person_add</span> {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="tbl-wrap">
        <div className="tbl-hdr">
          <div className="search-wrap">
            <span className="s-ico"><span className="material-icons-outlined" style={{ fontSize: 20 }}>search</span></span>
            <input
              type="text"
              placeholder="Search by name, email, username or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="sel" value={roleF} onChange={(e) => setRoleF(e.target.value)}>
            <option value="all">All Roles</option>
            {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <select className="sel" value={statusF} onChange={(e) => setStatusF(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
          <button className="btn-add" onClick={() => handleAdd()}>
            <span className="material-icons-outlined" style={{ fontSize: 16 }}>add</span> Add User
          </button>
        </div>

        <table className="data-tbl">
          <thead>
            <tr>
              <th>Name</th>
              <th>Sign-in ID</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Dashboard</th>
              <th>Status</th>
              <th>Join Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>Loading users...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>No users found</td></tr>
            ) : (
              filtered.map((u) => {
                const protectedAccount = u.role === 'super_admin';
                return (
                  <tr key={u.id}>
                    <td><strong>{u.name}</strong></td>
                    <td style={{ fontSize: 12 }}>
                      {u.username || u.email}
                      {u.username && u.email && u.username !== u.email && (
                        <div style={{ color: '#94a3b8' }}>{u.email}</div>
                      )}
                    </td>
                    <td style={{ fontSize: 12 }}>{u.phone || '-'}</td>
                    <td><span className={`badge badge-${u.role === 'super_admin' ? 'admin' : u.role}`}>{cap(u.role)}</span></td>
                    <td style={{ fontSize: 12 }}>
                      {DASHBOARD_NAME[u.role] || '-'}
                      <div style={{ color: canSignIn(u) ? '#15803d' : '#dc2626' }}>
                        {canSignIn(u) ? 'Can sign in' : 'Login blocked'}
                      </div>
                    </td>
                    <td><span className={`badge badge-${u.status}`}>{cap(u.status)}</span></td>
                    <td style={{ fontSize: 12 }}>{u.joinDate || '-'}</td>
                    <td>
                      <div className="act-icons">
                        <button className="ico-btn view" onClick={() => handleView(u)} title="View details">
                          <span className="material-icons-outlined" style={{ fontSize: 15 }}>visibility</span>
                        </button>
                        {!protectedAccount && (
                          <>
                            <button className="ico-btn edit" onClick={() => handleEdit(u)} title="Edit details">
                              <span className="material-icons-outlined" style={{ fontSize: 15 }}>edit</span>
                            </button>
                            <button
                              className={`ico-btn ${u.status === 'active' ? 'warn' : 'ok'}`}
                              onClick={() => handleToggleSuspend(u)}
                              title={u.status === 'active' ? 'Suspend (block login)' : 'Activate (allow login)'}
                            >
                              <span className="material-icons-outlined" style={{ fontSize: 15 }}>
                                {u.status === 'active' ? 'block' : 'check_circle'}
                              </span>
                            </button>
                            <button className="ico-btn danger" onClick={() => handleDelete(u)} title="Delete">
                              <span className="material-icons-outlined" style={{ fontSize: 15 }}>delete</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <div className="tbl-footer">
          Showing {filtered.length} of {users.length} users
        </div>
      </div>

      <Modal show={!!modal} onClose={() => setModal(null)} title={modal?.title || ''} subtitle={modal?.subtitle || ''} footer={footer}>
        {modal?.type === 'view' && modal.user && (
          <div style={{ display: 'grid', gap: 10, fontSize: 13 }}>
            <div><strong>Name:</strong> {modal.user.name}</div>
            <div><strong>Email:</strong> {modal.user.email}</div>
            <div><strong>Sign-in ID:</strong> {modal.user.username || modal.user.email}</div>
            <div><strong>Phone:</strong> {modal.user.phone || '-'}</div>
            <div><strong>Role:</strong> <span className={`badge badge-${modal.user.role}`}>{cap(modal.user.role)}</span></div>
            <div><strong>Dashboard:</strong> {DASHBOARD_NAME[modal.user.role] || '-'} ({ROLE_HOME[modal.user.role] || '-'})</div>
            <div><strong>Status:</strong> <span className={`badge badge-${modal.user.status}`}>{cap(modal.user.status)}</span>{' '}
              {canSignIn(modal.user) ? 'Can sign in' : 'Login blocked until the account is active'}
            </div>
            <div><strong>Joined:</strong> {modal.user.joinDate || '-'}</div>
          </div>
        )}

        {modal?.type === 'credentials' && (
          <div style={{ display: 'grid', gap: 10, fontSize: 13 }}>
            <div><strong>Login page:</strong> {window.location.origin}/login</div>
            <div><strong>Email / username:</strong> {modal.user.username || modal.user.email}</div>
            <div><strong>Password:</strong> <code style={{ userSelect: 'all' }}>{modal.password}</code></div>
            <div><strong>Opens:</strong> {DASHBOARD_NAME[modal.user.role] || cap(modal.user.role)} ({ROLE_HOME[modal.user.role] || '-'})</div>
          </div>
        )}

        {modal?.type === 'confirm' && (
          <p style={{ fontSize: 13, lineHeight: 1.6, color: '#475569' }}>{modal.message}</p>
        )}

        {(modal?.type === 'add' || modal?.type === 'edit') && (
          <div className="form-row">
            <div className="f-field">
              <label>Full Name *</label>
              <input value={modal.fields.name} onChange={(e) => setFields({ name: e.target.value })} placeholder="Full Name" />
            </div>
            <div className="f-field">
              <label>Email (sign-in ID) *</label>
              <input type="email" value={modal.fields.email} onChange={(e) => setFields({ email: e.target.value })} placeholder="Email Address" />
            </div>
            <div className="f-field">
              <label>Phone *</label>
              <input value={modal.fields.phone} onChange={(e) => setFields({ phone: e.target.value })} placeholder="+91 98765 43210" />
            </div>
            <div className="f-field">
              <label>Role / Dashboard *</label>
              <select value={modal.fields.role} onChange={(e) => setFields({ role: e.target.value })}>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label} — {r.dashboard}</option>
                ))}
              </select>
            </div>
            {modal.type === 'add' && (
              <div className="f-field full">
                <PasswordFields fields={modal.fields} onChange={setFields} />
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
