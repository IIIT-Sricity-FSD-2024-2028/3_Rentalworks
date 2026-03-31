// ===================================================
//  tenants_warden.js
//  Handles: Render, Add, View, Edit, Delete Tenants
// ===================================================

function renderTenants(filter = '', statusFilter = 'all') {
  const tbody = document.getElementById('tenants-tbody');
  if (!tbody) return;

  let filtered = tenants.filter(t => {
    const matchSearch = !filter || t.name.toLowerCase().includes(filter.toLowerCase()) ||
      t.room.includes(filter) || t.phone.includes(filter);
    const matchStatus = statusFilter === 'all' || t.paymentStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#6b7280;padding:24px">No tenants found</td></tr>`;
  } else {
    tbody.innerHTML = filtered.map(t => `
      <tr>
        <td>${t.name}</td>
        <td><span class="room-badge">${t.room}</span></td>
        <td>${t.phone}</td>
        <td>${t.checkIn}</td>
        <td>₹${t.rent.toLocaleString()}</td>
        <td><span class="badge badge-${t.paymentStatus}">${t.paymentStatus === 'paid' ? '✓ Paid' : '✗ Pending'}</span></td>
        <td>
          <div class="action-icons">
            <button class="icon-btn" onclick="viewTenant(${t.id})" title="View">👁️</button>
            <button class="icon-btn" onclick="editTenant(${t.id})" title="Edit">✏️</button>
            <button class="icon-btn" onclick="deleteTenant(${t.id})" title="Delete">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  const paid = tenants.filter(t => t.paymentStatus === 'paid').length;
  const pending = tenants.filter(t => t.paymentStatus === 'pending').length;
  setInner('tenant-total', tenants.length);
  setInner('tenant-paid', paid);
  setInner('tenant-pending', pending);
}

// ----- Add Tenant -----
function addTenant() {
  showModal('Add New Tenant', `
    <div class="form-group">
      <label>Full Name *</label>
      <div class="input-wrapper"><input type="text" id="add-name" placeholder="e.g. Rahul Kumar"/></div>
      <div class="error-msg" id="err-add-name"></div>
    </div>
    <div class="form-group">
      <label>Room Number *</label>
      <div class="input-wrapper"><input type="text" id="add-room" placeholder="e.g. 204"/></div>
      <div class="error-msg" id="err-add-room"></div>
    </div>
    <div class="form-group">
      <label>Phone Number *</label>
      <div class="input-wrapper"><input type="text" id="add-phone" placeholder="+91 98765 43210"/></div>
      <div class="error-msg" id="err-add-phone"></div>
    </div>
    <div class="form-group">
      <label>Check-In Date *</label>
      <div class="input-wrapper"><input type="date" id="add-checkin"/></div>
      <div class="error-msg" id="err-add-checkin"></div>
    </div>
    <div class="form-group">
      <label>Monthly Rent (₹) *</label>
      <div class="input-wrapper"><input type="number" id="add-rent" placeholder="e.g. 8000" min="0"/></div>
      <div class="error-msg" id="err-add-rent"></div>
    </div>
    <div class="form-group">
      <label>Payment Status</label>
      <select id="add-payment" class="filter-select" style="width:100%">
        <option value="pending">Pending</option>
        <option value="paid">Paid</option>
      </select>
    </div>
  `, () => {
    const name    = document.getElementById('add-name').value.trim();
    const room    = document.getElementById('add-room').value.trim();
    const phone   = document.getElementById('add-phone').value.trim();
    const checkin = document.getElementById('add-checkin').value;
    const rent    = parseInt(document.getElementById('add-rent').value);
    const payment = document.getElementById('add-payment').value;

    // Validation
    let valid = true;
    if (!name) { showFieldError('err-add-name', 'Name is required'); valid = false; }
    if (!room) { showFieldError('err-add-room', 'Room number is required'); valid = false; }
    if (!phone || !/^\+?[\d\s\-]{10,}$/.test(phone)) { showFieldError('err-add-phone', 'Enter a valid phone number'); valid = false; }
    if (!checkin) { showFieldError('err-add-checkin', 'Check-in date is required'); valid = false; }
    if (!rent || isNaN(rent) || rent <= 0) { showFieldError('err-add-rent', 'Enter a valid rent amount'); valid = false; }
    if (!valid) return;

    const newId = tenants.length > 0 ? Math.max(...tenants.map(t => t.id)) + 1 : 1;
    tenants.push({ id: newId, name, room, phone, checkIn: checkin, rent, paymentStatus: payment });
    saveToStorage();
    renderTenants();
    closeModal();
    showToast('success', 'Tenant Added', `${name} has been added successfully`);
  });
}

// ----- View Tenant -----
function viewTenant(id) {
  const tenant = tenants.find(t => t.id === id);
  if (!tenant) return;
  showModal('Tenant Details',
    `<div style="display:grid;gap:12px;font-size:13px">
      <div><strong>Name:</strong> ${tenant.name}</div>
      <div><strong>Room:</strong> ${tenant.room}</div>
      <div><strong>Phone:</strong> ${tenant.phone}</div>
      <div><strong>Check-in:</strong> ${tenant.checkIn}</div>
      <div><strong>Monthly Rent:</strong> ₹${tenant.rent.toLocaleString()}</div>
      <div><strong>Payment Status:</strong> <span class="badge badge-${tenant.paymentStatus}">${capitalize(tenant.paymentStatus)}</span></div>
    </div>`
  );
}

// ----- Edit Tenant -----
function editTenant(id) {
  const tenant = tenants.find(t => t.id === id);
  if (!tenant) return;
  showModal('Edit Tenant', `
    <div class="form-group">
      <label>Phone Number *</label>
      <div class="input-wrapper"><input type="text" id="edit-phone" value="${tenant.phone}" placeholder="Phone"/></div>
      <div class="error-msg" id="err-edit-phone"></div>
    </div>
    <div class="form-group">
      <label>Monthly Rent (₹) *</label>
      <div class="input-wrapper"><input type="number" id="edit-rent" value="${tenant.rent}" placeholder="Rent" min="0"/></div>
      <div class="error-msg" id="err-edit-rent"></div>
    </div>
    <div class="form-group">
      <label>Payment Status</label>
      <select id="edit-payment" class="filter-select" style="width:100%">
        <option value="paid" ${tenant.paymentStatus === 'paid' ? 'selected' : ''}>Paid</option>
        <option value="pending" ${tenant.paymentStatus === 'pending' ? 'selected' : ''}>Pending</option>
      </select>
    </div>
  `, () => {
    const phone = document.getElementById('edit-phone').value.trim();
    const rent  = parseInt(document.getElementById('edit-rent').value);
    const payment = document.getElementById('edit-payment').value;

    let valid = true;
    if (!phone || !/^\+?[\d\s\-]{10,}$/.test(phone)) { showFieldError('err-edit-phone', 'Enter a valid phone number'); valid = false; }
    if (!rent || isNaN(rent) || rent <= 0) { showFieldError('err-edit-rent', 'Enter a valid rent amount'); valid = false; }
    if (!valid) return;

    tenant.phone = phone;
    tenant.rent = rent;
    tenant.paymentStatus = payment;
    saveToStorage();
    renderTenants();
    closeModal();
    showToast('success', 'Tenant Updated', 'Changes saved successfully');
  });
}

// ----- Delete Tenant -----
function deleteTenant(id) {
  const tenant = tenants.find(t => t.id === id);
  if (!tenant) return;
  showModal('Delete Tenant',
    `<p style="font-size:14px;color:#374151">Are you sure you want to remove <strong>${tenant.name}</strong> (Room ${tenant.room})? This action cannot be undone.</p>`,
    () => {
      tenants = tenants.filter(t => t.id !== id);
      saveToStorage();
      renderTenants();
      closeModal();
      showToast('success', 'Tenant Removed', `${tenant.name} has been removed`);
    }
  );
}

// ----- Search & Filter Setup -----
function setupTenantSearch() {
  const tenantSearch = document.getElementById('tenant-search');
  if (tenantSearch) {
    tenantSearch.addEventListener('input', (e) => {
      const statusFilter = document.getElementById('tenant-status-filter').value;
      renderTenants(e.target.value, statusFilter);
    });
  }

  const tenantFilter = document.getElementById('tenant-status-filter');
  if (tenantFilter) {
    tenantFilter.addEventListener('change', () => {
      const search = document.getElementById('tenant-search').value;
      renderTenants(search, tenantFilter.value);
    });
  }
}
