import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';

const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [search, setSearch] = useState('');
  const [roleF, setRoleF] = useState('all');
  const [statusF, setStatusF] = useState('all');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const [uList, pList] = await Promise.all([
        api.getUsers(),
        api.getProperties()
      ]);
      setUsers(Array.isArray(uList) ? uList : []);
      setProperties(Array.isArray(pList) ? pList : []);
    } catch {
      toast('error', 'Error', 'Failed to load users');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const ms = !search ||
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.includes(search) ||
      u.property?.toLowerCase().includes(q);
    const mr = roleF === 'all' || u.role === roleF;
    const mst = statusF === 'all' || u.status === statusF;
    return ms && mr && mst;
  });

  const counts = {
    total: users.length,
    tenants: users.filter(u => u.role === 'tenant').length,
    owners: users.filter(u => u.role === 'owner').length,
    wardens: users.filter(u => u.role === 'warden').length,
    admins: users.filter(u => u.role === 'admin' || u.role === 'super_admin').length || 1
  };

  const propOptions = properties.map(p => ({ value: p.name, label: p.name }));

  const handleAdd = () => {
    const defaultProp = propOptions[0]?.value || '';
    setModal({
      type: 'add',
      title: 'Add New User',
      subtitle: 'Fill in the details to create a new user',
      fields: {
        name: '',
        email: '',
        phone: '',
        role: 'tenant',
        property: defaultProp
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
        role: u.role || 'tenant',
        property: u.property || ''
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
      message: `Are you sure you want to permanently delete <strong>${u.name}</strong>? This action cannot be undone.`,
      userId: u.id,
      userName: u.name
    });
  };

  const handleToggleSuspend = async (u) => {
    const newStatus = u.status === 'suspended' ? 'active' : 'suspended';
    try {
      await api.updateUser(u.id, { status: newStatus });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: newStatus } : x));
      toast('success', newStatus === 'active' ? 'User Activated' : 'User Suspended', `${u.name} status updated`);
    } catch {
      toast('error', 'Error', 'Failed to update user');
    }
  };

  const handleSave = async () => {
    if (!modal) return;
    const f = modal.fields;
    if (!f.name?.trim()) { toast('error', 'Validation', 'Name is required'); return; }
    if (!f.email?.trim() || !f.email.includes('@')) { toast('error', 'Validation', 'Enter a valid email'); return; }
    if (!f.phone?.trim()) { toast('error', 'Validation', 'Phone number is required'); return; }

    try {
      if (modal.type === 'add') {
        const payload = {
          name: f.name.trim(),
          email: f.email.trim(),
          phone: f.phone.trim(),
          role: f.role,
          property: f.property || '',
          username: f.email.trim().split('@')[0],
          password: 'password123'
        };
        const created = await api.createUser(payload);
        setUsers(prev => [...prev, created]);
        toast('success', 'User Added', `${f.name} added successfully`);
      } else if (modal.type === 'edit') {
        await api.updateUser(modal.userId, f);
        setUsers(prev => prev.map(u => u.id === modal.userId ? { ...u, ...f } : u));
        toast('success', 'User Updated', 'Changes saved successfully');
      }
    } catch {
      toast('error', 'Error', 'Failed to save user');
    }
    setModal(null);
  };

  const handleConfirmDelete = async () => {
    if (!modal) return;
    try {
      await api.deleteUser(modal.userId);
      setUsers(prev => prev.filter(u => u.id !== modal.userId));
      toast('success', 'User Deleted', `${modal.userName} removed from system`);
    } catch {
      toast('error', 'Error', 'Failed to delete user');
    }
    setModal(null);
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
            <div><strong>Property:</strong> {modal.user.property || 'Not assigned'}</div>
            <div><strong>Status:</strong> <span className={`badge badge-${modal.user.status}`}>{cap(modal.user.status)}</span></div>
            <div><strong>Joined:</strong> {modal.user.joinDate || '-'}</div>
          </div>
        )}

        {modal?.type === 'confirm' && (
          <p style={{ fontSize: 13, lineHeight: 1.6, color: '#475569' }} dangerouslySetInnerHTML={{ __html: modal.message }} />
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
              </select>
            </div>
            <div className="f-field full">
              <label>PG Property</label>
              <select
                value={modal.fields.property}
                onChange={e => setModal({ ...modal, fields: { ...modal.fields, property: e.target.value } })}
              >
                <option value="">Select Property...</option>
                {propOptions.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
