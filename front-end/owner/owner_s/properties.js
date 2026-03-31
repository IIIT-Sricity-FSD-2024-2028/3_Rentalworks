// properties.js
let allProperties = [];

document.addEventListener('DOMContentLoaded', async () => {
  await initPage('properties', 'Properties', 'Manage all your PG properties');
  await loadProperties();
});

async function loadProperties() {
  const data = await fetchData();
  allProperties = data.properties || [];
  renderPropertiesPage(allProperties);
}

function renderPropertiesPage(properties) {
  document.getElementById('pageContent').innerHTML = `
    <div class="flex-between mb-20">
      <div>
        <div style="font-size:15px;color:var(--text-muted)">${properties.length} properties found</div>
      </div>
      <a href="add-property.html" class="btn btn-primary">➕ Add Property</a>
    </div>

    <!-- Filter Bar -->
    <div class="filter-bar">
      <div class="filter-search">
        <span>🔍</span>
        <input type="text" id="propSearch" placeholder="Search by name, city..." oninput="filterProperties()">
      </div>
      <select class="filter-select" id="filterType" onchange="filterProperties()">
        <option value="">All Types</option>
        <option value="Mixed">Mixed</option>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
      </select>
      <select class="filter-select" id="filterStatus" onchange="filterProperties()">
        <option value="">All Status</option>
        <option value="Active">Active</option>
        <option value="Inactive">Inactive</option>
      </select>
      <select class="filter-select" id="filterSort" onchange="filterProperties()">
        <option value="">Sort By</option>
        <option value="name">Name A-Z</option>
        <option value="rent_asc">Rent: Low to High</option>
        <option value="rent_desc">Rent: High to Low</option>
        <option value="occupancy">Occupancy</option>
      </select>
    </div>

    <!-- Properties Grid -->
    <div class="properties-grid" id="propertiesGrid">
      ${renderPropertyCards(properties)}
    </div>
  `;
}

function renderPropertyCards(properties) {
  if (properties.length === 0) {
    return `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-icon">🏢</div>
      <h3>No Properties Found</h3>
      <p>Try adjusting your filters or add a new property.</p>
      <a href="add-property.html" class="btn btn-primary">➕ Add Property</a>
    </div>`;
  }
  return properties.map(p => {
    const pct = getOccupancyPercent(p.occupiedRooms, p.totalRooms);
    const cls = getOccupancyClass(pct);
    const amenitiesShown = (p.amenities || []).slice(0, 4);
    const extra = (p.amenities || []).length - 4;
    return `
    <div class="property-card" id="card-${p.id}">
      <div class="property-card-img">
        🏘
        <div class="property-card-status">
          <span class="badge badge-${p.status.toLowerCase()}">${p.status}</span>
        </div>
      </div>
      <div class="property-card-body">
        <div class="property-card-title">${p.name}</div>
        <div class="property-card-addr">📍 ${p.address}, ${p.city}, ${p.state}</div>
        <div class="property-meta">
          <div class="property-meta-item">🏠 <span>${p.type}</span></div>
          <div class="property-meta-item">🛏 <span>${p.totalRooms} rooms</span></div>
          <div class="property-meta-item">💰 <span>${formatCurrency(p.monthlyRent)}/mo</span></div>
        </div>
        <div class="occupancy-bar-wrap">
          <div class="occupancy-bar-label">
            <span>Occupancy</span>
            <span>${p.occupiedRooms}/${p.totalRooms} (${pct}%)</span>
          </div>
          <div class="occupancy-bar">
            <div class="occupancy-fill ${cls}" style="width:${pct}%"></div>
          </div>
        </div>
        <div class="property-amenities">
          ${amenitiesShown.map(a => `<span class="amenity-tag">${a}</span>`).join('')}
          ${extra > 0 ? `<span class="amenity-tag">+${extra} more</span>` : ''}
        </div>
        <div class="property-card-actions">
          <button class="btn btn-secondary btn-sm" style="flex:1" onclick="viewProperty('${p.id}')">👁 View</button>
          <button class="btn btn-secondary btn-sm" style="flex:1" onclick="editProperty('${p.id}')">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteProperty('${p.id}')">🗑</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function filterProperties() {
  const search = document.getElementById('propSearch')?.value.toLowerCase() || '';
  const type = document.getElementById('filterType')?.value || '';
  const status = document.getElementById('filterStatus')?.value || '';
  const sort = document.getElementById('filterSort')?.value || '';

  let filtered = allProperties.filter(p => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search) ||
      p.city.toLowerCase().includes(search) ||
      p.address.toLowerCase().includes(search);
    const matchType = !type || p.type === type;
    const matchStatus = !status || p.status === status;
    return matchSearch && matchType && matchStatus;
  });

  if (sort === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'rent_asc') filtered.sort((a, b) => a.monthlyRent - b.monthlyRent);
  else if (sort === 'rent_desc') filtered.sort((a, b) => b.monthlyRent - a.monthlyRent);
  else if (sort === 'occupancy') filtered.sort((a, b) => getOccupancyPercent(b.occupiedRooms, b.totalRooms) - getOccupancyPercent(a.occupiedRooms, a.totalRooms));

  const grid = document.getElementById('propertiesGrid');
  if (grid) grid.innerHTML = renderPropertyCards(filtered);
}

function viewProperty(id) {
  const p = allProperties.find(x => x.id === id);
  if (!p) return;
  const pct = getOccupancyPercent(p.occupiedRooms, p.totalRooms);
  openModal(`
    <div class="modal-header">
      <span class="modal-title">🏢 ${p.name}</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div><div class="text-xs text-muted">Address</div><div class="font-bold text-sm">${p.address}, ${p.city}</div></div>
        <div><div class="text-xs text-muted">State / PIN</div><div class="font-bold text-sm">${p.state} — ${p.pincode}</div></div>
        <div><div class="text-xs text-muted">Type</div><div class="font-bold text-sm">${p.type}</div></div>
        <div><div class="text-xs text-muted">Status</div><span class="badge badge-${p.status.toLowerCase()}">${p.status}</span></div>
        <div><div class="text-xs text-muted">Total Rooms</div><div class="font-bold text-sm">${p.totalRooms}</div></div>
        <div><div class="text-xs text-muted">Occupied</div><div class="font-bold text-sm">${p.occupiedRooms} (${pct}%)</div></div>
        <div><div class="text-xs text-muted">Monthly Rent</div><div class="font-bold text-sm" style="color:var(--primary)">${formatCurrency(p.monthlyRent)}</div></div>
        <div><div class="text-xs text-muted">Added</div><div class="font-bold text-sm">${formatDate(p.addedDate)}</div></div>
      </div>
      <div>
        <div class="text-xs text-muted mb-8">Amenities</div>
        <div class="property-amenities">${(p.amenities || []).map(a => `<span class="amenity-tag">${a}</span>`).join('')}</div>
      </div>
      <div class="occupancy-bar-wrap">
        <div class="occupancy-bar-label"><span>Occupancy</span><span>${pct}%</span></div>
        <div class="occupancy-bar"><div class="occupancy-fill ${getOccupancyClass(pct)}" style="width:${pct}%"></div></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Close</button>
      <button class="btn btn-primary" onclick="closeModal();editProperty('${p.id}')">✏️ Edit</button>
    </div>
  `);
}

function editProperty(id) {
  const p = allProperties.find(x => x.id === id);
  if (!p) return;
  const amenityList = ['WiFi', 'AC', 'Laundry', 'Parking', 'Gym', 'Mess', 'Power Backup', 'Security'];
  openModal(`
    <div class="modal-header">
      <span class="modal-title">✏️ Edit Property</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:14px;max-height:60vh;overflow-y:auto;padding-right:4px">
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Property Name</label>
          <input class="form-input" id="editName" value="${p.name}">
        </div>
        <div class="form-group">
          <label class="form-label">Type</label>
          <select class="form-input" id="editType">
            <option ${p.type==='Mixed'?'selected':''}>Mixed</option>
            <option ${p.type==='Male'?'selected':''}>Male</option>
            <option ${p.type==='Female'?'selected':''}>Female</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">City</label>
          <input class="form-input" id="editCity" value="${p.city}">
        </div>
        <div class="form-group">
          <label class="form-label">Monthly Rent (₹)</label>
          <input class="form-input" type="number" id="editRent" value="${p.monthlyRent}">
        </div>
        <div class="form-group">
          <label class="form-label">Total Rooms</label>
          <input class="form-input" type="number" id="editTotalRooms" value="${p.totalRooms}">
        </div>
        <div class="form-group">
          <label class="form-label">Occupied Rooms</label>
          <input class="form-input" type="number" id="editOccRooms" value="${p.occupiedRooms}">
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-input" id="editStatus">
            <option ${p.status==='Active'?'selected':''}>Active</option>
            <option ${p.status==='Inactive'?'selected':''}>Inactive</option>
          </select>
        </div>
      </div>
      <div>
        <div class="form-label mb-8">Amenities</div>
        <div class="amenities-grid">
          ${amenityList.map(a => `
            <div class="amenity-toggle ${p.amenities?.includes(a) ? 'selected' : ''}" data-amenity="${a}" onclick="toggleAmenityEdit(this)">
              ${a}
            </div>`).join('')}
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="savePropertyEdit('${p.id}')">💾 Save Changes</button>
    </div>
  `);
}

function toggleAmenityEdit(el) {
  el.classList.toggle('selected');
}

async function savePropertyEdit(id) {
  const data = getData();
  if (!data) return;
  const idx = data.properties.findIndex(p => p.id === id);
  if (idx === -1) return;

  const name = document.getElementById('editName').value.trim();
  const city = document.getElementById('editCity').value.trim();
  const rent = parseInt(document.getElementById('editRent').value);
  const totalRooms = parseInt(document.getElementById('editTotalRooms').value);
  const occRooms = parseInt(document.getElementById('editOccRooms').value);

  if (!name || !city || isNaN(rent)) {
    showToast('Please fill all required fields', 'error'); return;
  }
  if (occRooms > totalRooms) {
    showToast('Occupied rooms cannot exceed total rooms', 'error'); return;
  }

  const selectedAmenities = [...document.querySelectorAll('.amenity-toggle.selected')].map(el => el.dataset.amenity);

  data.properties[idx] = {
    ...data.properties[idx],
    name,
    city,
    monthlyRent: rent,
    totalRooms,
    occupiedRooms: occRooms,
    type: document.getElementById('editType').value,
    status: document.getElementById('editStatus').value,
    amenities: selectedAmenities
  };
  updateData(data);
  allProperties = data.properties;
  closeModal();
  showToast('Property updated successfully!', 'success');
  renderPropertiesPage(allProperties);
}

function deleteProperty(id) {
  const p = allProperties.find(x => x.id === id);
  if (!p) return;
  confirmDialog('Delete Property', `Are you sure you want to delete "<strong>${p.name}</strong>"? This cannot be undone.`, async () => {
    const data = getData();
    data.properties = data.properties.filter(x => x.id !== id);
    updateData(data);
    allProperties = data.properties;
    closeModal();
    showToast(`"${p.name}" deleted successfully`, 'success');
    const card = document.getElementById(`card-${id}`);
    if (card) { card.style.opacity = '0'; card.style.transform = 'scale(0.95)'; card.style.transition = '0.3s'; setTimeout(() => renderPropertiesPage(allProperties), 300); }
    else renderPropertiesPage(allProperties);
  });
}