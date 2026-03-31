// ===================================================
//  users_admin.js
//  Handles: Render Users, Add, Edit, Delete,
//           Suspend/Activate, Search, Filter
// ===================================================

function renderUsers(search = '', roleF = 'all', statusF = 'all') {
  // Dynamic KPI counts
  const counts = {
    total:   users.length,
    tenants: users.filter(u => u.role === 'tenant').length,
    owners:  users.filter(u => u.role === 'owner').length,
    wardens: users.filter(u => u.role === 'warden').length
  };
  setTxt('u-total',   counts.total);
  setTxt('u-tenants', counts.tenants);
  setTxt('u-owners',  counts.owners);
  setTxt('u-wardens', counts.wardens);
  setTxt('u-admins',  0);

  let filtered = users.filter(u => {
    const ms  = !search || u.name.toLowerCase().includes(search.toLowerCase()) ||
                u.email.toLowerCase().includes(search.toLowerCase()) ||
                u.phone.includes(search);
    const mr  = roleF   === 'all' || u.role   === roleF;
    const mst = statusF === 'all' || u.status === statusF;
    return ms && mr && mst;
  });

  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:24px">No users found</td></tr>`;
  } else {
    tbody.innerHTML = filtered.map(u => `
      <tr>
        <td><strong>${u.name}</strong></td>
        <td style="font-size:12px">${u.email}</td>
        <td style="font-size:12px">${u.phone}</td>
        <td><span class="badge badge-${u.role}">${cap(u.role)}</span></td>
        <td style="font-size:12px">${u.property}</td>
        <td><span class="badge badge-${u.status}">${cap(u.status)}</span></td>
        <td style="font-size:12px">${u.joinDate}</td>
        <td>
          <div class="act-icons">
            <button class="ico-btn" onclick="viewUser(${u.id})" title="View">👁️</button>
            <button class="ico-btn" onclick="editUser(${u.id})" title="Edit">✏️</button>
            <button class="ico-btn warn" onclick="toggleSuspend(${u.id})" title="${u.status === 'suspended' ? 'Activate' : 'Suspend'}">
              ${u.status === 'suspended' ? '✅' : '🚫'}
            </button>
            <button class="ico-btn danger" onclick="deleteUser(${u.id})" title="Delete">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  setTxt('users-count', `Showing ${filtered.length} of ${users.length} users`);
  setupUserFilters();
}

// ===== VIEW USER =====
function viewUser(id) {
  const u = users.find(x => x.id === id);
  if (!u) return;
  showInfoModal('👤 User Details', u.email,
    `<div style="display:grid;gap:10px;font-size:13px">
      <div><strong>Name:</strong> ${u.name}</div>
      <div><strong>Email:</strong> ${u.email}</div>
      <div><strong>Phone:</strong> ${u.phone}</div>
      <div><strong>Role:</strong> <span class="badge badge-${u.role}">${cap(u.role)}</span></div>
      <div><strong>Property:</strong> ${u.property}</div>
      <div><strong>Status:</strong> <span class="badge badge-${u.status}">${cap(u.status)}</span></div>
      <div><strong>Joined:</strong> ${u.joinDate}</div>
    </div>`
  );
}

// ===== ADD USER =====
function addUser() {
  const propOptions = properties.map(p => ({ value: p.name, label: p.name }));
  showFormModal('Add New User', 'Fill in the details to create a new user', [
    { label: 'Full Name',   id: 'f-name',     type: 'text',   required: true },
    { label: 'Email',       id: 'f-email',    type: 'email',  required: true },
    { label: 'Phone',       id: 'f-phone',    type: 'text',   required: true, placeholder: '+91 98765 43210' },
    { label: 'Role',        id: 'f-role',     type: 'select', options: ['tenant', 'owner', 'warden'], required: true },
    { label: 'PG Property', id: 'f-property', type: 'select', options: propOptions, required: true }
  ], () => {
    const name     = g('f-name').value.trim();
    const email    = g('f-email').value.trim();
    const phone    = g('f-phone').value.trim();
    const role     = g('f-role').value;
    const property = g('f-property').value;

    let ok = true;
    if (!name)              { showFieldErr('f-name',     'Name is required');          ok = false; }
    if (!validEmail(email)) { showFieldErr('f-email',    'Enter a valid email');        ok = false; }
    if (!validPhone(phone)) { showFieldErr('f-phone',    'Enter a valid phone number'); ok = false; }
    if (!property)          { showFieldErr('f-property', 'Select a property');          ok = false; }
    if (!ok) return;

    users.push({
      id: Date.now(), name, email, phone, role, property,
      status: 'active', joinDate: new Date().toISOString().split('T')[0]
    });
    saveData();
    renderUsers();
    closeModal();
    showToast('success', 'User Added', `${name} added successfully`);
  }, 'btn-confirm-blue', 'Add User');
}

// ===== EDIT USER =====
function editUser(id) {
  const u = users.find(x => x.id === id);
  if (!u) return;
  const propOptions = properties.map(p => ({ value: p.name, label: p.name }));
  showFormModal('Edit User', 'Update user details', [
    { label: 'Full Name',   id: 'f-name',     type: 'text',   value: u.name,     required: true },
    { label: 'Email',       id: 'f-email',    type: 'email',  value: u.email,    required: true },
    { label: 'Phone',       id: 'f-phone',    type: 'text',   value: u.phone,    required: true },
    { label: 'Role',        id: 'f-role',     type: 'select', value: u.role,     options: ['tenant', 'owner', 'warden'] },
    { label: 'PG Property', id: 'f-property', type: 'select', value: u.property, options: propOptions }
  ], () => {
    const name     = g('f-name').value.trim();
    const email    = g('f-email').value.trim();
    const phone    = g('f-phone').value.trim();
    const role     = g('f-role').value;
    const property = g('f-property').value;

    let ok = true;
    if (!name)              { showFieldErr('f-name',  'Name is required');          ok = false; }
    if (!validEmail(email)) { showFieldErr('f-email', 'Enter a valid email');        ok = false; }
    if (!validPhone(phone)) { showFieldErr('f-phone', 'Enter a valid phone number'); ok = false; }
    if (!ok) return;

    u.name = name; u.email = email; u.phone = phone; u.role = role; u.property = property;
    saveData(); renderUsers(); closeModal();
    showToast('success', 'User Updated', 'Changes saved successfully');
  }, 'btn-confirm-blue', 'Save Changes');
}

// ===== TOGGLE SUSPEND =====
function toggleSuspend(id) {
  const u = users.find(x => x.id === id);
  if (!u) return;
  u.status = u.status === 'suspended' ? 'active' : 'suspended';
  saveData(); renderUsers();
  showToast('success', u.status === 'active' ? 'User Activated' : 'User Suspended', u.name + ' status updated');
}

// ===== DELETE USER =====
function deleteUser(id) {
  const u = users.find(x => x.id === id);
  if (!u) return;
  pendingAction = () => {
    users = users.filter(x => x.id !== id);
    saveData(); renderUsers(); closeModal();
    showToast('success', 'User Deleted', u.name + ' removed from system');
  };
  openConfirmModal('Delete User',
    `Are you sure you want to permanently delete <strong>${u.name}</strong>? This action cannot be undone.`,
    'btn-confirm-red', 'Delete User'
  );
}

// ===== FILTERS =====
function setupUserFilters() {
  const s  = document.getElementById('user-search');
  const r  = document.getElementById('user-role-filter');
  const st = document.getElementById('user-status-filter');
  if (s)  s.oninput  = () => renderUsers(s.value, r?.value, st?.value);
  if (r)  r.onchange = () => renderUsers(s?.value, r.value, st?.value);
  if (st) st.onchange = () => renderUsers(s?.value, r?.value, st.value);
}
