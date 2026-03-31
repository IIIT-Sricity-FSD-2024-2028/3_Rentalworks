// add-property.js
const AMENITY_LIST = [
  { label: 'WiFi', icon: '📶' },
  { label: 'AC', icon: '❄️' },
  { label: 'Laundry', icon: '🧺' },
  { label: 'Parking', icon: '🚗' },
  { label: 'Gym', icon: '💪' },
  { label: 'Mess', icon: '🍽️' },
  { label: 'Power Backup', icon: '⚡' },
  { label: 'Security', icon: '🔒' },
];

document.addEventListener('DOMContentLoaded', async () => {
  await initPage('add-property', 'Add Property', 'Submit property details for system verification');
  renderAddPropertyPage();
});

function renderAddPropertyPage() {
  document.getElementById('pageContent').innerHTML = `
    <div class="page-header">
      <a href="properties.html" class="back-link">← Back to Properties</a>
      <h1>Add New Property</h1>
      <p>Submit property details for system verification</p>
    </div>

    <!-- Section 01: Basic Information -->
    <div class="form-section">
      <div class="form-section-header">
        <div class="num-badge">01</div>
        <div class="form-section-title">Basic Information</div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Property Name <span class="req">*</span></label>
          <input type="text" class="form-input" id="propName" placeholder="e.g. Sunrise PG">
          <span class="form-error">Property name is required</span>
        </div>
        <div class="form-group">
          <label class="form-label">Address <span class="req">*</span></label>
          <input type="text" class="form-input" id="propAddress" placeholder="Street address">
          <span class="form-error">Address is required</span>
        </div>
        <div class="form-group">
          <label class="form-label">City <span class="req">*</span></label>
          <input type="text" class="form-input" id="propCity" placeholder="Mumbai">
          <span class="form-error">City is required</span>
        </div>
        <div class="form-group">
          <label class="form-label">State <span class="req">*</span></label>
          <input type="text" class="form-input" id="propState" placeholder="Maharashtra">
          <span class="form-error">State is required</span>
        </div>
        <div class="form-group">
          <label class="form-label">Pincode <span class="req">*</span></label>
          <input type="text" class="form-input" id="propPincode" placeholder="400001" maxlength="6">
          <span class="form-error">Valid 6-digit pincode required</span>
        </div>
        <div class="form-group">
          <label class="form-label">Property Type <span class="req">*</span></label>
          <select class="form-input" id="propType">
            <option value="">Select type</option>
            <option value="Mixed">Mixed (Male & Female)</option>
            <option value="Male">Male Only</option>
            <option value="Female">Female Only</option>
          </select>
          <span class="form-error">Please select a type</span>
        </div>
      </div>
    </div>

    <!-- Section 02: Property Details -->
    <div class="form-section">
      <div class="form-section-header">
        <div class="num-badge">02</div>
        <div class="form-section-title">Property Details</div>
      </div>
      <div class="form-grid-3">
        <div class="form-group">
          <label class="form-label">Total Capacity <span class="req">*</span></label>
          <input type="number" class="form-input" id="propCapacity" placeholder="20" min="1">
          <span class="form-error">Capacity is required</span>
        </div>
        <div class="form-group">
          <label class="form-label">Total Rooms <span class="req">*</span></label>
          <input type="number" class="form-input" id="propRooms" placeholder="10" min="1">
          <span class="form-error">Total rooms is required</span>
        </div>
        <div class="form-group">
          <label class="form-label">Monthly Rent (₹) <span class="req">*</span></label>
          <input type="number" class="form-input" id="propRent" placeholder="8000" min="0">
          <span class="form-error">Rent is required</span>
        </div>
        <div class="form-group">
          <label class="form-label">Currently Occupied</label>
          <input type="number" class="form-input" id="propOccupied" placeholder="0" min="0" value="0">
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-input" id="propStatus">
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Section 03: Amenities -->
    <div class="form-section">
      <div class="form-section-header">
        <div class="num-badge">03</div>
        <div class="form-section-title">Amenities</div>
      </div>
      <div class="amenities-grid" id="amenitiesGrid">
        ${AMENITY_LIST.map(a => `
          <div class="amenity-toggle" data-amenity="${a.label}" onclick="toggleAmenity(this)">
            <span>${a.icon}</span> ${a.label}
          </div>`).join('')}
      </div>
    </div>

    <!-- Section 04: Description (Optional) -->
    <div class="form-section">
      <div class="form-section-header">
        <div class="num-badge">04</div>
        <div class="form-section-title">Additional Notes <span style="font-weight:400;color:var(--text-muted);font-size:13px">(Optional)</span></div>
      </div>
      <div class="form-group">
        <label class="form-label">Property Description</label>
        <textarea class="form-input" id="propDesc" placeholder="Enter any additional details about the property, rules, nearby landmarks..." rows="4"></textarea>
      </div>
    </div>

    <!-- Actions -->
    <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:8px">
      <a href="properties.html" class="btn btn-secondary btn-lg">Cancel</a>
      <button class="btn btn-primary btn-lg" id="submitBtn" onclick="submitProperty()">
        ✅ Submit for Verification
      </button>
    </div>
  `;
}

function toggleAmenity(el) {
  el.classList.toggle('selected');
}

async function submitProperty() {
  clearFormErrors();

  // Validation
  const fields = [
    { id: 'propName', msg: 'Property name is required' },
    { id: 'propAddress', msg: 'Address is required' },
    { id: 'propCity', msg: 'City is required' },
    { id: 'propState', msg: 'State is required' },
    { id: 'propType', msg: 'Please select a property type' },
    { id: 'propCapacity', msg: 'Total capacity is required' },
    { id: 'propRooms', msg: 'Total rooms is required' },
    { id: 'propRent', msg: 'Monthly rent is required' },
  ];
  let valid = validateForm(fields);

  // Pincode validation
  const pincode = document.getElementById('propPincode').value.trim();
  if (!/^\d{6}$/.test(pincode)) {
    const g = document.getElementById('propPincode').closest('.form-group');
    g.classList.add('has-error');
    g.querySelector('.form-error').textContent = 'Enter a valid 6-digit pincode';
    valid = false;
  }

  if (!valid) { showToast('Please fix the errors in the form', 'error'); return; }

  const occupied = parseInt(document.getElementById('propOccupied').value) || 0;
  const totalRooms = parseInt(document.getElementById('propRooms').value);
  if (occupied > totalRooms) {
    showToast('Occupied rooms cannot exceed total rooms', 'error'); return;
  }

  const selectedAmenities = [...document.querySelectorAll('#amenitiesGrid .amenity-toggle.selected')]
    .map(el => el.dataset.amenity);

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Submitting...';

  // Simulate async save
  await new Promise(r => setTimeout(r, 800));

  const data = getData() || await fetchData();
  const newProperty = {
    id: generateId('prop'),
    name: document.getElementById('propName').value.trim(),
    address: document.getElementById('propAddress').value.trim(),
    city: document.getElementById('propCity').value.trim(),
    state: document.getElementById('propState').value.trim(),
    pincode: pincode,
    type: document.getElementById('propType').value,
    totalCapacity: parseInt(document.getElementById('propCapacity').value),
    totalRooms: totalRooms,
    occupiedRooms: occupied,
    monthlyRent: parseInt(document.getElementById('propRent').value),
    amenities: selectedAmenities,
    status: document.getElementById('propStatus').value,
    addedDate: new Date().toISOString().split('T')[0],
    description: document.getElementById('propDesc').value.trim()
  };

  data.properties.push(newProperty);
  updateData(data);

  // Push to cross-actor simulation system for Admin
  let crossNotifs = JSON.parse(localStorage.getItem('cross_notifications') || '[]');
  crossNotifs.push({
    id: Date.now(),
    title: 'New Property Pending Verification',
    message: `Owner submitted "${newProperty.name}" in ${newProperty.city} for approval.`,
    type: 'alert',
    priority: 'important',
    targetRole: 'admin',
    by: 'Owner',
    sentAt: new Date().toLocaleString()
  });
  localStorage.setItem('cross_notifications', JSON.stringify(crossNotifs));

  showToast(`"${newProperty.name}" added successfully!`, 'success');

  // Redirect after short delay
  setTimeout(() => { window.location.href = 'properties.html'; }, 1200);
}