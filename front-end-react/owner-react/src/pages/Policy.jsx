import React, { useState, useEffect } from 'react';

// Default policy rules
const DEFAULT_POLICY = {
  rentDueDay: 5,
  lateFee: 500,
  securityDeposit: 2,
  rentIncrease: 10,
  leaseTermMonths: 11,
  noticePeriod: 30,
  autoRenew: true,
  guestPolicy: 'allowed',
  guestHours: '09:00-21:00',
  smokingAllowed: false,
  petsAllowed: false,
  maintenanceWindow: '09:00-18:00',
  rentIncreaseFrequency: 'yearly',
};

// Policy: Configure PG rules, finances, and guidelines
export default function Policy({ policy = {}, onSavePolicy, onResetPolicy }) {
  const [formData, setFormData] = useState(
    Object.assign({}, DEFAULT_POLICY, policy)
  );
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setFormData((prev) => Object.assign({}, prev, policy));
  }, [policy]);

  const handleChange = (e) => {
    const id = e.target.id;
    const value = e.target.value;
    const type = e.target.type;
    const update = {};
    update[id] = type === 'number' ? (value === '' ? '' : Number(value)) : value;
    setFormData((prev) => Object.assign({}, prev, update));
  };

  const handleToggle = (key) => {
    const update = {};
    update[key] = !formData[key];
    setFormData((prev) => Object.assign({}, prev, update));
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (formData.rentDueDay < 1 || formData.rentDueDay > 31) {
      setErrorMessage('Rent due day must be between 1 and 31');
      return;
    }
    setErrorMessage('');
    onSavePolicy(formData);
  };

  const handleConfirmReset = () => {
    setFormData(DEFAULT_POLICY);
    onResetPolicy();
    setIsResetModalOpen(false);
  };

  return (
    <div>
      {errorMessage && (
        <div className="alert-danger-box">{errorMessage}</div>
      )}

      <form onSubmit={handleSave}>
        {/* Section 01: Financials */}
        <div className="form-section">
          <div className="form-section-header">
            <div className="num-badge">01</div>
            <div className="form-section-title">Rent & Financial Policy</div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Rent Due Day (of month)</label>
              <input
                type="number"
                className="form-input"
                id="rentDueDay"
                min="1"
                max="31"
                value={formData.rentDueDay}
                onChange={handleChange}
              />
              <span className="form-hint">Day of month when rent is due</span>
            </div>

            <div className="form-group">
              <label className="form-label">Late Fee (₹)</label>
              <input
                type="number"
                className="form-input"
                id="lateFee"
                min="0"
                value={formData.lateFee}
                onChange={handleChange}
              />
              <span className="form-hint">Charged after due date</span>
            </div>

            <div className="form-group">
              <label className="form-label">Security Deposit (months)</label>
              <input
                type="number"
                className="form-input"
                id="securityDeposit"
                min="1"
                max="12"
                value={formData.securityDeposit}
                onChange={handleChange}
              />
              <span className="form-hint">Number of months as deposit</span>
            </div>

            <div className="form-group">
              <label className="form-label">Yearly Rent Increase (%)</label>
              <input
                type="number"
                className="form-input"
                id="rentIncrease"
                min="0"
                max="100"
                value={formData.rentIncrease}
                onChange={handleChange}
              />
              <span className="form-hint">Annual increment percentage</span>
            </div>

            <div className="form-group">
              <label className="form-label">Lease Term (months)</label>
              <input
                type="number"
                className="form-input"
                id="leaseTermMonths"
                min="1"
                value={formData.leaseTermMonths}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notice Period (days)</label>
              <input
                type="number"
                className="form-input"
                id="noticePeriod"
                min="0"
                value={formData.noticePeriod}
                onChange={handleChange}
              />
              <span className="form-hint">Days required before vacating</span>
            </div>
          </div>

          <div className="divider"></div>

          <div className="toggle-wrap">
            <div>
              <div className="toggle-label">Auto-Renew Lease</div>
              <div className="toggle-desc">Automatically renew lease at end of term</div>
            </div>
            <div
              className={`toggle-switch ${formData.autoRenew ? 'on' : ''}`}
              id="toggleAutoRenew"
              onClick={() => handleToggle('autoRenew')}
            ></div>
          </div>
        </div>

        {/* Section 02: House Rules */}
        <div className="form-section">
          <div className="form-section-header">
            <div className="num-badge">02</div>
            <div className="form-section-title">Guest & House Rules</div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Guest Policy</label>
              <select
                className="form-input"
                id="guestPolicy"
                value={formData.guestPolicy}
                onChange={handleChange}
              >
                <option value="allowed">Allowed</option>
                <option value="restricted">Restricted</option>
                <option value="not-allowed">Not Allowed</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Guest Visit Hours</label>
              <input
                type="text"
                className="form-input"
                id="guestHours"
                placeholder="09:00-21:00"
                value={formData.guestHours}
                onChange={handleChange}
              />
              <span className="form-hint">Format: HH:MM-HH:MM</span>
            </div>
          </div>

          <div className="divider"></div>

          <div className="toggle-wrap">
            <div>
              <div className="toggle-label">Smoking Allowed</div>
              <div className="toggle-desc">Permit smoking on the premises</div>
            </div>
            <div
              className={`toggle-switch ${formData.smokingAllowed ? 'on' : ''}`}
              id="toggleSmoking"
              onClick={() => handleToggle('smokingAllowed')}
            ></div>
          </div>

          <div className="toggle-wrap">
            <div>
              <div className="toggle-label">Pets Allowed</div>
              <div className="toggle-desc">Allow tenants to keep pets</div>
            </div>
            <div
              className={`toggle-switch ${formData.petsAllowed ? 'on' : ''}`}
              id="togglePets"
              onClick={() => handleToggle('petsAllowed')}
            ></div>
          </div>
        </div>

        {/* Section 03: Maintenance */}
        <div className="form-section">
          <div className="form-section-header">
            <div className="num-badge">03</div>
            <div className="form-section-title">Maintenance Policy</div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Maintenance Window</label>
              <input
                type="text"
                className="form-input"
                id="maintenanceWindow"
                placeholder="09:00-18:00"
                value={formData.maintenanceWindow}
                onChange={handleChange}
              />
              <span className="form-hint">Time range for maintenance work</span>
            </div>

            <div className="form-group">
              <label className="form-label">Rent Increase Frequency</label>
              <select
                className="form-input"
                id="rentIncreaseFrequency"
                value={formData.rentIncreaseFrequency}
                onChange={handleChange}
              >
                <option value="yearly">Yearly</option>
                <option value="half-yearly">Half-Yearly</option>
                <option value="never">Never</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex-end-gap">
          <button
            type="button"
            className="btn btn-secondary btn-lg"
            onClick={() => setIsResetModalOpen(true)}
          >
            <span className="material-icons icon-18 icon-middle">restart_alt</span>{' '}
            Reset to Default
          </button>
          <button type="submit" className="btn btn-primary btn-lg">
            <span className="material-icons icon-18 icon-middle">save</span>{' '}
            Save Policy
          </button>
        </div>
      </form>

      {/* Reset Modal */}
      {isResetModalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target.className === 'modal-overlay') setIsResetModalOpen(false);
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Reset Policy</span>
              <button
                className="modal-close"
                onClick={() => setIsResetModalOpen(false)}
              >
                ×
              </button>
            </div>
            <p className="modal-desc-text">
              Reset all policy settings to their default values?
            </p>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setIsResetModalOpen(false)}
              >
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleConfirmReset}>
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
