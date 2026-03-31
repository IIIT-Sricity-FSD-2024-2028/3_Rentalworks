// policy.js
let currentPolicy = {};

document.addEventListener('DOMContentLoaded', async () => {
  await initPage('policy', 'Policy', 'Configure PG rules and rental policies');
  await loadPolicy();
});

async function loadPolicy() {
  const data = await fetchData();
  currentPolicy = data.policy || {};
  renderPolicyPage(currentPolicy);
}

function renderPolicyPage(policy) {
  document.getElementById('pageContent').innerHTML = `
    <!-- Rent Policy -->
    <div class="form-section">
      <div class="form-section-header">
        <div class="num-badge">01</div>
        <div class="form-section-title">Rent & Financial Policy</div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Rent Due Day (of month)</label>
          <input type="number" class="form-input" id="rentDueDay" value="${policy.rentDueDay || 5}" min="1" max="31">
          <span class="form-hint">Day of month when rent is due</span>
        </div>
        <div class="form-group">
          <label class="form-label">Late Fee (₹)</label>
          <input type="number" class="form-input" id="lateFee" value="${policy.lateFee || 500}" min="0">
          <span class="form-hint">Charged after due date</span>
        </div>
        <div class="form-group">
          <label class="form-label">Security Deposit (months)</label>
          <input type="number" class="form-input" id="securityDeposit" value="${policy.securityDeposit || 2}" min="1" max="12">
          <span class="form-hint">Number of months as deposit</span>
        </div>
        <div class="form-group">
          <label class="form-label">Yearly Rent Increase (%)</label>
          <input type="number" class="form-input" id="rentIncrease" value="${policy.rentIncrease || 10}" min="0" max="100">
          <span class="form-hint">Annual increment percentage</span>
        </div>
        <div class="form-group">
          <label class="form-label">Lease Term (months)</label>
          <input type="number" class="form-input" id="leaseTermMonths" value="${policy.leaseTermMonths || 11}" min="1">
        </div>
        <div class="form-group">
          <label class="form-label">Notice Period (days)</label>
          <input type="number" class="form-input" id="noticePeriod" value="${policy.noticePeriod || 30}" min="0">
          <span class="form-hint">Days required before vacating</span>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Toggles -->
      <div class="toggle-wrap">
        <div>
          <div class="toggle-label">Auto-Renew Lease</div>
          <div class="toggle-desc">Automatically renew lease at end of term</div>
        </div>
        <div class="toggle-switch ${policy.autoRenew ? 'on' : ''}" id="toggleAutoRenew" onclick="toggleSwitch('toggleAutoRenew', 'autoRenew')"></div>
      </div>
    </div>

    <!-- Guest Policy -->
    <div class="form-section">
      <div class="form-section-header">
        <div class="num-badge">02</div>
        <div class="form-section-title">Guest & House Rules</div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Guest Policy</label>
          <select class="form-input" id="guestPolicy">
            <option value="allowed" ${policy.guestPolicy === 'allowed' ? 'selected' : ''}>Allowed</option>
            <option value="restricted" ${policy.guestPolicy === 'restricted' ? 'selected' : ''}>Restricted</option>
            <option value="not-allowed" ${policy.guestPolicy === 'not-allowed' ? 'selected' : ''}>Not Allowed</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Guest Visit Hours</label>
          <input type="text" class="form-input" id="guestHours" value="${policy.guestHours || '09:00-21:00'}" placeholder="09:00-21:00">
          <span class="form-hint">Format: HH:MM-HH:MM</span>
        </div>
      </div>
      <div class="divider"></div>
      <div class="toggle-wrap">
        <div>
          <div class="toggle-label">Smoking Allowed</div>
          <div class="toggle-desc">Permit smoking on the premises</div>
        </div>
        <div class="toggle-switch ${policy.smokingAllowed ? 'on' : ''}" id="toggleSmoking" onclick="toggleSwitch('toggleSmoking', 'smokingAllowed')"></div>
      </div>
      <div class="toggle-wrap">
        <div>
          <div class="toggle-label">Pets Allowed</div>
          <div class="toggle-desc">Allow tenants to keep pets</div>
        </div>
        <div class="toggle-switch ${policy.petsAllowed ? 'on' : ''}" id="togglePets" onclick="toggleSwitch('togglePets', 'petsAllowed')"></div>
      </div>
    </div>

    <!-- Maintenance Policy -->
    <div class="form-section">
      <div class="form-section-header">
        <div class="num-badge">03</div>
        <div class="form-section-title">Maintenance Policy</div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Maintenance Window</label>
          <input type="text" class="form-input" id="maintenanceWindow" value="${policy.maintenanceWindow || '09:00-18:00'}" placeholder="09:00-18:00">
          <span class="form-hint">Time range for maintenance work</span>
        </div>
        <div class="form-group">
          <label class="form-label">Rent Increase Frequency</label>
          <select class="form-input" id="rentIncreaseFrequency">
            <option value="yearly" ${policy.rentIncreaseFrequency === 'yearly' ? 'selected' : ''}>Yearly</option>
            <option value="half-yearly" ${policy.rentIncreaseFrequency === 'half-yearly' ? 'selected' : ''}>Half-Yearly</option>
            <option value="never" ${policy.rentIncreaseFrequency === 'never' ? 'selected' : ''}>Never</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div style="display:flex;gap:12px;justify-content:flex-end">
      <button class="btn btn-secondary btn-lg" onclick="resetPolicy()">🔄 Reset to Default</button>
      <button class="btn btn-primary btn-lg" onclick="savePolicy()">💾 Save Policy</button>
    </div>
  `;

  // Store toggle states in memory
  window._policyToggles = {
    autoRenew: !!policy.autoRenew,
    smokingAllowed: !!policy.smokingAllowed,
    petsAllowed: !!policy.petsAllowed
  };
}

function toggleSwitch(switchId, key) {
  const el = document.getElementById(switchId);
  if (!el) return;
  el.classList.toggle('on');
  window._policyToggles[key] = el.classList.contains('on');
}

async function savePolicy() {
  const data = getData();
  if (!data) return;

  const rentDueDay = parseInt(document.getElementById('rentDueDay').value);
  if (rentDueDay < 1 || rentDueDay > 31) {
    showToast('Rent due day must be between 1 and 31', 'error'); return;
  }

  data.policy = {
    ...data.policy,
    rentDueDay,
    lateFee: parseInt(document.getElementById('lateFee').value) || 0,
    securityDeposit: parseInt(document.getElementById('securityDeposit').value) || 2,
    rentIncrease: parseInt(document.getElementById('rentIncrease').value) || 0,
    leaseTermMonths: parseInt(document.getElementById('leaseTermMonths').value) || 11,
    noticePeriod: parseInt(document.getElementById('noticePeriod').value) || 30,
    guestPolicy: document.getElementById('guestPolicy').value,
    guestHours: document.getElementById('guestHours').value.trim(),
    maintenanceWindow: document.getElementById('maintenanceWindow').value.trim(),
    rentIncreaseFrequency: document.getElementById('rentIncreaseFrequency').value,
    autoRenew: window._policyToggles?.autoRenew || false,
    smokingAllowed: window._policyToggles?.smokingAllowed || false,
    petsAllowed: window._policyToggles?.petsAllowed || false,
  };

  updateData(data);
  currentPolicy = data.policy;
  showToast('Policy saved successfully!', 'success');
  renderPolicyPage(currentPolicy);
}

function resetPolicy() {
  confirmDialog('Reset Policy', 'Reset all policy settings to their default values?', () => {
    const defaults = {
      noticePeriod: 30, securityDeposit: 2, rentDueDay: 5, lateFee: 500,
      guestPolicy: 'allowed', guestHours: '09:00-21:00',
      smokingAllowed: false, petsAllowed: false,
      maintenanceWindow: '09:00-18:00',
      rentIncrease: 10, rentIncreaseFrequency: 'yearly',
      autoRenew: true, leaseTermMonths: 11
    };
    const data = getData();
    data.policy = defaults;
    updateData(data);
    currentPolicy = defaults;
    closeModal();
    showToast('Policy reset to defaults', 'success');
    renderPolicyPage(defaults);
  });
}