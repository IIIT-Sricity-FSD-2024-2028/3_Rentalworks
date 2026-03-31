// ===================================================
//  properties_admin.js
//  Handles: Property cards, onboarding pipeline,
//           approve/reject, offboarding, change requests
// ===================================================

function renderProperties(search = '') {
  const pending  = properties.filter(p => p.status === 'pending').length;
  const approved = properties.filter(p => p.status === 'approved').length;
  const rejected = properties.filter(p => p.status === 'rejected').length;
  const offboarding = properties.filter(p => p.status === 'offboarding').length;

  setTxt('prop-total',       properties.length);
  setTxt('prop-approved',    approved);
  setTxt('prop-pending',     pending);
  setTxt('prop-rejected',    rejected);

  const filtered = search
    ? properties.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.owner.toLowerCase().includes(search.toLowerCase()) ||
        p.location.toLowerCase().includes(search.toLowerCase())
      )
    : properties;

  const grid = document.getElementById('prop-grid');
  if (!grid) return;

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="text-align:center;color:#94a3b8;padding:40px;grid-column:1/-1">No properties found</div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => buildPropertyCard(p)).join('');
  setupPropSearch();
}

function buildPropertyCard(p) {
  const docsOk      = p.docsVerified || false;
  const inspectionOk = p.inspectionPassed || false;
  const hasChangeReq = p.changeRequestPending || false;
  const commission   = p.commissionRate || 10;
  const compliance   = p.compliance || 'Verified';
  const fireSafety   = p.fireSafety || 'Yes';

  // Pipeline badges for pending
  let pipelineBadges = '';
  if (p.status === 'pending') {
    pipelineBadges = `
      <div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">
        <span style="font-size:10px;padding:3px 8px;border-radius:20px;font-weight:600;background:${docsOk ? '#dcfce7' : '#fef9c3'};color:${docsOk ? '#15803d' : '#b45309'}">
          ${docsOk ? '✓' : '⏳'} Docs ${docsOk ? 'Verified' : 'Pending'}
        </span>
        <span style="font-size:10px;padding:3px 8px;border-radius:20px;font-weight:600;background:${inspectionOk ? '#dcfce7' : '#fef9c3'};color:${inspectionOk ? '#15803d' : '#b45309'}">
          ${inspectionOk ? '✓' : '⏳'} Inspection ${inspectionOk ? 'Passed' : 'Pending'}
        </span>
      </div>`;
  }

  // Change request alert
  let changeReqAlert = '';
  if (hasChangeReq) {
    changeReqAlert = `
      <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:6px;padding:8px 10px;margin-bottom:10px;font-size:11px;color:#92400e;display:flex;align-items:center;gap:6px">
        ⚠️ <strong>Change Request Pending</strong> — Owner requested rent/location update
      </div>`;
  }

  // Offboarding badge
  let offboardBadge = '';
  if (p.status === 'offboarding') {
    offboardBadge = `<span style="font-size:10px;padding:3px 8px;border-radius:20px;font-weight:600;background:#ffedd5;color:#ea580c;margin-left:6px">Offboarding</span>`;
  }

  // Action buttons
  let actionBtns = '';
  if (p.status === 'pending') {
    if (docsOk && inspectionOk) {
      actionBtns = `
        <button class="btn-approve" onclick="approveProperty(${p.id})">✓ Approve Property</button>
        <button class="btn-reject"  onclick="rejectProperty(${p.id})">✗ Reject</button>`;
    } else {
      actionBtns = `
        ${!docsOk ? `<button class="btn-verify-docs" onclick="viewPropertyDocuments(${p.id})">📂 View & Verify Docs</button>` : ''}
        ${docsOk && !inspectionOk ? `<button class="btn-inspection" onclick="openInspectionReport(${p.id})">📝 Pass Live Inspection</button>` : ''}`;
    }
  } else if (p.status === 'approved') {
    actionBtns = `
      <button class="btn-edit-prop" onclick="editProperty(${p.id})">✏️ Edit</button>
      <button class="btn-offboard"  onclick="initiateOffboarding(${p.id})">⚠️ Notice Period</button>`;
  } else if (p.status === 'offboarding') {
    actionBtns = `<button class="btn-reject" onclick="finalRemoveProperty(${p.id})">Finalize Removal</button>`;
  } else if (p.status === 'rejected') {
    actionBtns = `<button class="btn-approve" onclick="approveProperty(${p.id})">Reconsider</button>`;
  }

  return `
    <div class="prop-card" id="prop-${p.id}">
      <div class="prop-card-hdr">
        <h3>${p.name} ${offboardBadge}</h3>
        <span class="badge badge-${p.status}">${cap(p.status)}</span>
      </div>
      <div class="prop-location">📍 ${p.location}</div>
      <div class="prop-owner">Owner: <span>${p.owner}</span></div>
      ${pipelineBadges}
      ${changeReqAlert}
      <div class="prop-details">
        <div class="prop-detail">
          <div class="pd-lbl">Rent Range</div>
          <div class="pd-val">₹${p.rentMin.toLocaleString()} – ₹${p.rentMax.toLocaleString()}</div>
        </div>
        <div class="prop-detail">
          <div class="pd-lbl">Safety Score</div>
          <div class="pd-val">${p.safetyScore}/10</div>
          <div class="safety-bar"><div class="safety-fill" style="width:${(p.safetyScore / 10) * 100}%"></div></div>
        </div>
        <div class="prop-detail">
          <div class="pd-lbl">Rooms</div>
          <div class="pd-val">${p.rooms} occupied</div>
        </div>
        <div class="prop-detail">
          <div class="pd-lbl">Occupancy</div>
          <div class="pd-val">${p.occupancy}%</div>
        </div>
        <div class="prop-detail">
          <div class="pd-lbl">Commission Rate</div>
          <div class="pd-val" style="color:#7c3aed">${commission}%</div>
        </div>
        <div class="prop-detail">
          <div class="pd-lbl">Compliance</div>
          <div class="pd-val" style="color:#16a34a;font-size:12px">✓ ${compliance}</div>
        </div>
      </div>
      <div style="font-size:11px;color:#475569;margin-bottom:10px">
        🔥 Fire Safety: ${fireSafety}
      </div>
      <div class="prop-amenities">
        ${p.amenities.map(a => `<span class="amenity-tag">${a}</span>`).join('')}
      </div>
      <div class="prop-actions">${actionBtns}</div>
    </div>
  `;
}

// ===== PIPELINE ACTIONS =====
function verifyDocs(id) {
  const p = properties.find(x => x.id === id);
  if (!p) return;
  p.docsVerified = true;
  saveData(); renderProperties();
  showToast('success', 'Docs Verified', `Documentation for ${p.name} marked as verified`);
}

function passInspection(id) {
  const p = properties.find(x => x.id === id);
  if (!p) return;
  p.inspectionPassed = true;
  saveData(); renderProperties();
  showToast('success', 'Inspection Passed', `${p.name} passed live inspection`);
}

function approveProperty(id) {
  const p = properties.find(x => x.id === id);
  if (!p) return;
  p.status = 'approved';
  saveData(); renderProperties();
  showToast('success', 'Property Approved', `${p.name} is now live on the platform`);
}

function rejectProperty(id) {
  const p = properties.find(x => x.id === id);
  if (!p) return;
  pendingAction = () => {
    p.status = 'rejected';
    saveData(); renderProperties(); closeModal();
    showToast('error', 'Property Rejected', `${p.name} has been rejected`);
  };
  openConfirmModal('Reject Property',
    `Are you sure you want to reject <strong>${p.name}</strong>? The owner will be notified.`,
    'btn-confirm-red', 'Reject'
  );
}

function initiateOffboarding(id) {
  const p = properties.find(x => x.id === id);
  if (!p) return;
  pendingAction = () => {
    p.status = 'offboarding';
    saveData(); renderProperties(); closeModal();
    showToast('warning', 'Notice Period Initiated', `${p.name} has entered the offboarding notice period`);
  };
  openConfirmModal('Initiate Notice Period',
    `This will begin the offboarding process for <strong>${p.name}</strong>. The property will enter a notice period before removal. Tenants will be notified.`,
    'btn-confirm-red', 'Initiate Notice Period'
  );
}

function finalRemoveProperty(id) {
  const p = properties.find(x => x.id === id);
  if (!p) return;
  pendingAction = () => {
    properties = properties.filter(x => x.id !== id);
    saveData(); renderProperties(); closeModal();
    showToast('success', 'Property Removed', `${p.name} has been removed from the platform`);
  };
  openConfirmModal('Finalize Removal',
    `This will permanently remove <strong>${p.name}</strong> from the platform. This cannot be undone.`,
    'btn-confirm-red', 'Remove Property'
  );
}

// ===== ADD PROPERTY =====
function addProperty() {
  showFormModal('Add New Property', 'Register a new PG property', [
    { label: 'Property Name', id: 'p-name',     type: 'text',   required: true },
    { label: 'Location',      id: 'p-location', type: 'text',   required: true },
    { label: 'Owner Name',    id: 'p-owner',    type: 'text',   required: true },
    { label: 'Min Rent (₹)',  id: 'p-rentmin',  type: 'number', required: true },
    { label: 'Max Rent (₹)',  id: 'p-rentmax',  type: 'number', required: true },
    { label: 'Total Rooms',   id: 'p-rooms',    type: 'text',   required: true, placeholder: 'e.g. 0/20' }
  ], () => {
    const name     = g('p-name').value.trim();
    const location = g('p-location').value.trim();
    const owner    = g('p-owner').value.trim();
    const rentMin  = parseInt(g('p-rentmin').value);
    const rentMax  = parseInt(g('p-rentmax').value);
    const rooms    = g('p-rooms').value.trim();

    let ok = true;
    if (!name)     { showFieldErr('p-name',     'Property name required'); ok = false; }
    if (!location) { showFieldErr('p-location', 'Location required');      ok = false; }
    if (!owner)    { showFieldErr('p-owner',    'Owner name required');    ok = false; }
    if (isNaN(rentMin) || rentMin <= 0) { showFieldErr('p-rentmin', 'Enter valid min rent'); ok = false; }
    if (isNaN(rentMax) || rentMax <= rentMin) { showFieldErr('p-rentmax', 'Max must be > min'); ok = false; }
    if (!ok) return;

    properties.push({
      id: Date.now(), name, location, owner, rentMin, rentMax,
      rooms, safetyScore: 8.0, occupancy: 0,
      amenities: ['WiFi'], status: 'pending',
      docsVerified: false, inspectionPassed: false,
      commissionRate: 10, compliance: 'Pending', fireSafety: 'Pending'
    });
    saveData(); renderProperties(); closeModal();
    showToast('success', 'Property Added', `${name} added and pending review`);
  }, 'btn-confirm-blue', 'Add Property');
}

// ===== EDIT PROPERTY =====
function editProperty(id) {
  const p = properties.find(x => x.id === id);
  if (!p) return;
  showFormModal('Edit Property', 'Note: Rent and Location changes require owner approval', [
    { label: 'Property Name', id: 'p-name',    type: 'text',   value: p.name,     required: true },
    { label: 'Owner Name',    id: 'p-owner',   type: 'text',   value: p.owner,    required: true },
    { label: 'Safety Score',  id: 'p-safety',  type: 'number', value: p.safetyScore },
    { label: 'Occupancy %',   id: 'p-occ',     type: 'number', value: p.occupancy }
  ], () => {
    p.name        = g('p-name').value.trim()  || p.name;
    p.owner       = g('p-owner').value.trim() || p.owner;
    p.safetyScore = parseFloat(g('p-safety').value) || p.safetyScore;
    p.occupancy   = parseInt(g('p-occ').value) || p.occupancy;
    saveData(); renderProperties(); closeModal();
    showToast('success', 'Property Updated', 'Changes saved');
  }, 'btn-confirm-blue', 'Save Changes');
}

// ===== SEARCH SETUP =====
function setupPropSearch() {
  const s = document.getElementById('prop-search');
  if (s) s.oninput = () => renderProperties(s.value);
}

// ===== 1. DOCUMENT VIEWER (The "Submitted" Docs) =====
function viewPropertyDocuments(id) {
  const p = properties.find(x => x.id === id);
  const docsHtml = `
    <div style="margin-top:10px; border-top:1px solid #eee; padding-top:10px;">
      <p style="font-size:13px; color:#666; margin-bottom:10px;">Please verify the following uploaded files:</p>
      <div style="display:grid; gap:8px;">
        <div style="display:flex; justify-content:space-between; background:#f8fafc; padding:12px; border:1px solid #e2e8f0; border-radius:6px;">
          <span style="font-size:14px;">📄 Ownership_Deed.pdf</span>
          <strong style="color:#2563eb; cursor:pointer; font-size:12px;">VIEW</strong>
        </div>
        <div style="display:flex; justify-content:space-between; background:#f8fafc; padding:12px; border:1px solid #e2e8f0; border-radius:6px;">
          <span style="font-size:14px;">📄 Fire_Safety_NOC.pdf</span>
          <strong style="color:#2563eb; cursor:pointer; font-size:12px;">VIEW</strong>
        </div>
      </div>
    </div>`;

  // Note: fields is passed as []
  showFormModal(`Verify Docs: ${p.name}`, docsHtml, [], () => {
    p.docsVerified = true;
    saveData(); renderProperties();
    showToast('success', 'Verified', 'Documents marked as valid');
  }, 'btn-confirm-blue', 'Approve All Documents');
}

// ===== 2. INSPECTION REPORT (The "Live" Report) =====
function openInspectionReport(id) {
  const p = properties.find(x => x.id === id);
  if (!p) return;

  // 1. Define the report HTML as a string (this will go into the subtitle)
  const reportHtml = `
    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
      <div style="background: #fffbeb; padding: 10px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #f59e0b;">
        <small style="color: #92400e; display: block;">Field Audit for:</small>
        <strong style="color: #92400e;">${p.name}</strong>
      </div>
      
      <div style="display: grid; gap: 12px;">
        <label style="display:flex; gap:10px; font-size:13px; cursor:pointer; align-items:center;">
          <input type="checkbox" checked> Structural Integrity Check Passed
        </label>
        <label style="display:flex; gap:10px; font-size:13px; cursor:pointer; align-items:center;">
          <input type="checkbox" checked> CCTV & Security Operational
        </label>
        <label style="display:flex; gap:10px; font-size:13px; cursor:pointer; align-items:center;">
          <input type="checkbox" checked> Fire Safety & Emergency Exits
        </label>
        
        <div style="margin-top:5px;">
          <label style="display:block; font-size:11px; color:#64748b; margin-bottom:4px;">Inspector Remarks</label>
          <textarea style="width:100%; padding:8px; font-size:12px; border-radius:6px; border:1px solid #cbd5e1; height:60px; resize:none; font-family:inherit;">Site visit completed. All safety standards are met. Property is ready for live listing.</textarea>
        </div>
      </div>
    </div>
  `;

  // 2. Call the updated showFormModal
  // We pass reportHtml as the SECOND argument (subtitle)
  // We pass an empty array [] as the THIRD argument (fields)
  showFormModal(
    `Live Inspection: ${p.name}`, 
    reportHtml, 
    [], 
    () => {
      p.inspectionPassed = true;
      saveData(); 
      renderProperties();
      showToast('success', 'Inspection Passed', 'Property has cleared the physical site audit.');
    }, 
    'btn-confirm-blue', 
    'Submit Inspection Report'
  );
}