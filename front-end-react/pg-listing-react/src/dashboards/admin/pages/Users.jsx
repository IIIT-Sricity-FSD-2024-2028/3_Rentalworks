import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { runThunk } from '../../../app/hooks';
import { adminUsers } from '../../../features/admin/adminSlices';
import { useToast } from '../components/useToast';
import Modal from '../components/Modal';

const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

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

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const ms = !search ||
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.includes(search);
    const mr = roleF === 'all' || u.role === roleF;
    const mst = statusF === 'all' || u.status === statusF;
    return ms && mr && mst;
  });

  const counts = {
    total: users.length,
    tenants: users.filter(u => u.role === 'tenant').length,
    owners: users.filter(u => u.role === 'owner').length,
    wardens: users.filter(u => u.role === 'warden').length,
    admins: users.filter(u => u.role === 'admin' || u.role === 'super_admin').length
  };

  const handleAdd = () => {
    setModal({
      type: 'add',
      title: 'Add New User',
      subtitle: 'Fill in the details to create a new user',
      fields: {
        name: '',
        email: '',
        phone: '',
        role: 'tenant',
        password: ''
      }
    });
  };

  const handleEdit = (u) => {
    setModal({
      type: 'edit',
      title: 'Edit User',
      subtitle: 'Update user details',
      userId: u.id,
      fields: {
        name: u.name || '',
        email: u.email || '',
        phone: u.phone || '',
        role: u.role || 'tenant'
      }
    });
  };

  const handleView = (u) => {
    setModal({
      type: 'view',
      title: '👤 User Details',
      subtitle: u.email,
      user: u
    });
  };

  const handleDelete = (u) => {
    setModal({
      type: 'confirm',
      title: 'Delete User',
      message: `Are you sure you want to permanently delete "${u.name}"? This action cannot be undone.`,
      userId: u.id,
      userName: u.name
    });
  };

  const handleToggleSuspend = (u) => {
    const status = u.status === 'suspended' ? 'active' : 'suspended';
    runThunk(dispatch, adminUsers.thunks.updateItem({ id: u.id, changes: { status } }), {
      success: status === 'active' ? `${u.name} activated` : `${u.name} suspended`,
    });
  };

  const handleSave = async () => {
    if (!modal || saving) return;
    const f = modal.fields;
    const details = { name: f.name.trim(), email: f.email.trim().toLowerCase(), phone: f.phone.trim(), role: f.role };
    if (!details.name) { toast('error', 'Validation', 'Name is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) { toast('error', 'Validation', 'Enter a valid email'); return; }
    if (!details.phone) { toast('error', 'Validation', 'Phone number is required'); return; }
    if (modal.type === 'add' && f.password.length < 8) { toast('error', 'Validation', 'Temporary password must be at least 8 characters'); return; }

    const { ok } = modal.type === 'add'
      ? await runThunk(dispatch, adminUsers.thunks.createItem({ ...details, username: details.email, password: f.password }), { success: `${details.name} added. They sign in with their email and the password you set.` })
      : await runThunk(dispatch, adminUsers.thunks.updateItem({ id: modal.userId, changes: details }), { success: 'Changes saved' });
    if (ok) setModal(null);
  };

  const handleConfirmDelete = async () => {
    if (!modal || saving) return;
    const { ok } = await runThunk(dispatch, adminUsers.thunks.removeItem(modal.userId), { success: `${modal.userName} removed` });
    if (ok) setModal(null);
  };

  return (
    <>
      <div className="sec-hdr">
        <h2>User Management</h2>
        <p>Manage all users across the platform</p>
      </div>

      {/* 5 Dynamic KPI Cards */}
      <div className="user-summary">
        <div className="u-sum-card">
          <div className="u-sum-label">Total Users</div>
          <div className="u-sum-val">{counts.total}</div>
        </div>
        <div className="u-sum-card">
          <div className="u-sum-label">Active Tenants</div>
          <div className="u-sum-val blue">{counts.tenants}</div>
        </div>
        <div className="u-sum-card">
          <div className="u-sum-label">Property Owners</div>
          <div className="u-sum-val purple">{counts.owners}</div>
        </div>
        <div className="u-sum-card">
          <div className="u-sum-label">Total Wardens</div>
          <div className="u-sum-val green">{counts.wardens}</div>
        </div>
        <div className="u-sum-card">
          <div className="u-sum-label">Admins</div>
          <div className="u-sum-val red">{counts.admins}</div>
        </div>
      </div>

      {/* Table Card */}
      <div className="tbl-wrap">
        <div className="tbl-hdr">
          <div className="search-wrap">
            <span className="s-ico"><span className="material-icons-outlined" style={{ fontSize: 20 }}>search</span></span>
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="sel" value={roleF} onChange={e => setRoleF(e.target.value)}>
            <option value="all">All Roles</option>
            <option value="tenant">Tenant</option>
            <option value="owner">Owner</option>
            <option value="warden">Warden</option>
          </select>
          <select className="sel" value={statusF} onChange={e => setStatusF(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <button className="btn-add" onClick={handleAdd}>
            <span className="material-icons-outlined" style={{ fontSize: 16 }}>add</span> Add User
          </button>
        </div>

        <table className="data-tbl">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>PG Property</th>
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
              filtered.map(u => (
                <tr key={u.id}>
                  <td><strong>{u.name}</strong></td>
                  <td style={{ fontSize: 12 }}>{u.email}</td>
                  <td style={{ fontSize: 12 }}>{u.phone}</td>
                  <td><span className={`badge badge-${u.role}`}>{cap(u.role)}</span></td>
                  <td style={{ fontSize: 12 }}>{u.property || '-'}</td>
                  <td><span className={`badge badge-${u.status}`}>{cap(u.status)}</span></td>
                  <td style={{ fontSize: 12 }}>{u.joinDate || '-'}</td>
                  <td>
                    <div className="act-icons">
                      <button className="ico-btn" onClick={() => handleView(u)} title="View">👁️</button>
                      <button className="ico-btn" onClick={() => handleEdit(u)} title="Edit">✏️</button>
                      <button
                        className="ico-btn warn"
                        onClick={() => handleToggleSuspend(u)}
                        title={u.status === 'suspended' ? 'Activate' : 'Suspend'}
                      >
                        {u.status === 'suspended' ? '✅' : '🚫'}
                      </button>
                      <button className="ico-btn danger" onClick={() => handleDelete(u)} title="Delete">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="tbl-footer">
          Showing {filtered.length} of {users.length} users
        </div>
      </div>

      {/* Modal */}
      <Modal
        show={!!modal}
        onClose={() => setModal(null)}
        title={modal?.title || ''}
        subtitle={modal?.subtitle || ''}
        footer={
          modal?.type === 'confirm' ? (
            <>
              <button className="btn-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-confirm-red" onClick={handleConfirmDelete}>Delete User</button>
            </>
          ) : modal?.type === 'view' ? (
            <button className="btn-cancel" onClick={() => setModal(null)}>Close</button>
          ) : (
            <>
              <button className="btn-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-confirm-blue" onClick={handleSave}>
                {modal?.type === 'add' ? 'Add User' : 'Save Changes'}
              </button>
            </>
          )
        }
      >
        {modal?.type === 'view' && modal.user && (
          <div style={{ display: 'grid', gap: 10, fontSize: 13 }}>
            <div><strong>Name:</strong> {modal.user.name}</div>
            <div><strong>Email:</strong> {modal.user.email}</div>
            <div><strong>Phone:</strong> {modal.user.phone}</div>
            <div><strong>Role:</strong> <span className={`badge badge-${modal.user.role}`}>{cap(modal.user.role)}</span></div>
            <div><strong>Username:</strong> {modal.user.username || '-'}</div>
            <div><strong>Status:</strong> <span className={`badge badge-${modal.user.status}`}>{cap(modal.user.status)}</span></div>
            <div><strong>Joined:</strong> {modal.user.joinDate || '-'}</div>
          </div>
        )}

        {modal?.type === 'confirm' && (
          <p style={{ fontSize: 13, lineHeight: 1.6, color: '#475569' }}>{modal.message}</p>
        )}

        {(modal?.type === 'add' || modal?.type === 'edit') && (
          <div className="form-row">
            <div className="f-field">
              <label>Full Name *</label>
              <input
                value={modal.fields.name}
                onChange={e => setModal({ ...modal, fields: { ...modal.fields, name: e.target.value } })}
                placeholder="Full Name"
              />
            </div>
            <div className="f-field">
              <label>Email *</label>
              <input
                type="email"
                value={modal.fields.email}
                onChange={e => setModal({ ...modal, fields: { ...modal.fields, email: e.target.value } })}
                placeholder="Email Address"
              />
            </div>
            <div className="f-field">
              <label>Phone *</label>
              <input
                value={modal.fields.phone}
                onChange={e => setModal({ ...modal, fields: { ...modal.fields, phone: e.target.value } })}
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="f-field">
              <label>Role *</label>
              <select
                value={modal.fields.role}
                onChange={e => setModal({ ...modal, fields: { ...modal.fields, role: e.target.value } })}
              >
                <option value="tenant">Tenant</option>
                <option value="owner">Owner</option>
                <option value="warden">Warden</option>
                {modal.type === 'edit' && <option value="guest">Guest</option>}
                {modal.fields.role === 'admin' && <option value="admin">Admin</option>}
              </select>
            </div>
            {modal.type === 'add' && (
              <div className="f-field full">
                <label>Temporary Password *</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={modal.fields.password}
                  onChange={e => setModal({ ...modal, fields: { ...modal.fields, password: e.target.value } })}
                  placeholder="Min 8 characters"
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
