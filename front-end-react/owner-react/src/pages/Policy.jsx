import { ownerClasses } from "../classes";
import Icon from "../components/Icon";
import React, { useState, useEffect } from "react";

// Empty fields mean the owner has not saved a value yet.
const EMPTY_POLICY = {
  rentDueDay: "",
  lateFee: "",
  securityDeposit: "",
  rentIncrease: "",
  leaseTermMonths: "",
  noticePeriod: "",
  guestPolicy: "",
  guestHours: "",
  maintenanceWindow: "",
  rentIncreaseFrequency: "",
};

// Policy: Configure PG rules, finances, and guidelines
export default function Policy({ policy = {}, onSavePolicy, onResetPolicy }) {
  const [formData, setFormData] = useState(
    Object.assign({}, EMPTY_POLICY, policy),
  );
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setFormData((prev) => Object.assign({}, EMPTY_POLICY, policy));
  }, [policy]);

  const handleChange = (e) => {
    const id = e.target.id;
    const value = e.target.value;
    const type = e.target.type;
    const update = {};
    update[id] =
      type === "number" ? (value === "" ? "" : Number(value)) : value;
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
      setErrorMessage("Rent due day must be between 1 and 31");
      return;
    }
    setErrorMessage("");
    onSavePolicy(
      Object.fromEntries(
        Object.entries(formData).filter(([, value]) => value !== ""),
      ),
    );
  };

  const handleConfirmReset = async () => {
    if (await onResetPolicy(EMPTY_POLICY)) {
      setFormData({ ...EMPTY_POLICY, ...policy });
      setIsResetModalOpen(false);
    }
  };

  return (
    <div>
      {!Object.keys(policy).length && (
        <p role="status">
          No policy has been saved. Enter your property rules below.
        </p>
      )}
      {errorMessage && (
        <div className={ownerClasses("alert-danger-box")}>{errorMessage}</div>
      )}

      <form onSubmit={handleSave}>
        {/* Section 01: Financials */}
        <div className={ownerClasses("form-section")}>
          <div className={ownerClasses("form-section-header")}>
            <div className={ownerClasses("num-badge")}>01</div>
            <div className={ownerClasses("form-section-title")}>
              Rent & Financial Policy
            </div>
          </div>

          <div className={ownerClasses("form-grid")}>
            <div className={ownerClasses("form-group")}>
              <label className={ownerClasses("form-label")}>
                Rent Due Day (of month)
              </label>
              <input
                type="number"
                className={ownerClasses("form-input")}
                id="rentDueDay"
                min="1"
                max="31"
                value={formData.rentDueDay}
                onChange={handleChange}
              />

              <span className={ownerClasses("form-hint")}>
                Day of month when rent is due
              </span>
            </div>

            <div className={ownerClasses("form-group")}>
              <label className={ownerClasses("form-label")}>Late Fee (₹)</label>
              <input
                type="number"
                className={ownerClasses("form-input")}
                id="lateFee"
                min="0"
                value={formData.lateFee}
                onChange={handleChange}
              />

              <span className={ownerClasses("form-hint")}>
                Charged after due date
              </span>
            </div>

            <div className={ownerClasses("form-group")}>
              <label className={ownerClasses("form-label")}>
                Security Deposit (months)
              </label>
              <input
                type="number"
                className={ownerClasses("form-input")}
                id="securityDeposit"
                min="1"
                max="12"
                value={formData.securityDeposit}
                onChange={handleChange}
              />

              <span className={ownerClasses("form-hint")}>
                Number of months as deposit
              </span>
            </div>

            <div className={ownerClasses("form-group")}>
              <label className={ownerClasses("form-label")}>
                Yearly Rent Increase (%)
              </label>
              <input
                type="number"
                className={ownerClasses("form-input")}
                id="rentIncrease"
                min="0"
                max="100"
                value={formData.rentIncrease}
                onChange={handleChange}
              />

              <span className={ownerClasses("form-hint")}>
                Annual increment percentage
              </span>
            </div>

            <div className={ownerClasses("form-group")}>
              <label className={ownerClasses("form-label")}>
                Lease Term (months)
              </label>
              <input
                type="number"
                className={ownerClasses("form-input")}
                id="leaseTermMonths"
                min="1"
                value={formData.leaseTermMonths}
                onChange={handleChange}
              />
            </div>

            <div className={ownerClasses("form-group")}>
              <label className={ownerClasses("form-label")}>
                Notice Period (days)
              </label>
              <input
                type="number"
                className={ownerClasses("form-input")}
                id="noticePeriod"
                min="0"
                value={formData.noticePeriod}
                onChange={handleChange}
              />

              <span className={ownerClasses("form-hint")}>
                Days required before vacating
              </span>
            </div>
          </div>

          <div className={ownerClasses("divider")}></div>

          <div className={ownerClasses("toggle-wrap")}>
            <div>
              <div className={ownerClasses("toggle-label")}>
                Auto-Renew Lease
              </div>
              <div className={ownerClasses("toggle-desc")}>
                Automatically renew lease at end of term
              </div>
            </div>
            <select aria-label="Auto-renew lease" className={ownerClasses("form-input")} value={formData.autoRenew === undefined ? "" : String(formData.autoRenew)} onChange={e => setFormData(previous => ({ ...previous, autoRenew: e.target.value === "" ? undefined : e.target.value === "true" }))}><option value="">Not set</option><option value="true">Yes</option><option value="false">No</option></select>
          </div>
        </div>

        {/* Section 02: House Rules */}
        <div className={ownerClasses("form-section")}>
          <div className={ownerClasses("form-section-header")}>
            <div className={ownerClasses("num-badge")}>02</div>
            <div className={ownerClasses("form-section-title")}>
              Guest & House Rules
            </div>
          </div>

          <div className={ownerClasses("form-grid")}>
            <div className={ownerClasses("form-group")}>
              <label className={ownerClasses("form-label")}>Guest Policy</label>
              <select
                className={ownerClasses("form-input")}
                id="guestPolicy"
                value={formData.guestPolicy}
                onChange={handleChange}
              >
                <option value="">Not set</option>
                <option value="allowed">Allowed</option>
                <option value="restricted">Restricted</option>
                <option value="not-allowed">Not Allowed</option>
              </select>
            </div>

            <div className={ownerClasses("form-group")}>
              <label className={ownerClasses("form-label")}>
                Guest Visit Hours
              </label>
              <input
                type="text"
                className={ownerClasses("form-input")}
                id="guestHours"
                placeholder="09:00-21:00"
                value={formData.guestHours}
                onChange={handleChange}
              />

              <span className={ownerClasses("form-hint")}>
                Format: HH:MM-HH:MM
              </span>
            </div>
          </div>

          <div className={ownerClasses("divider")}></div>

          <div className={ownerClasses("toggle-wrap")}>
            <div>
              <div className={ownerClasses("toggle-label")}>
                Smoking Allowed
              </div>
              <div className={ownerClasses("toggle-desc")}>
                Permit smoking on the premises
              </div>
            </div>
            <select aria-label="Smoking allowed" className={ownerClasses("form-input")} value={formData.smokingAllowed === undefined ? "" : String(formData.smokingAllowed)} onChange={e => setFormData(previous => ({ ...previous, smokingAllowed: e.target.value === "" ? undefined : e.target.value === "true" }))}><option value="">Not set</option><option value="true">Yes</option><option value="false">No</option></select>
          </div>

          <div className={ownerClasses("toggle-wrap")}>
            <div>
              <div className={ownerClasses("toggle-label")}>Pets Allowed</div>
              <div className={ownerClasses("toggle-desc")}>
                Allow tenants to keep pets
              </div>
            </div>
            <select aria-label="Pets allowed" className={ownerClasses("form-input")} value={formData.petsAllowed === undefined ? "" : String(formData.petsAllowed)} onChange={e => setFormData(previous => ({ ...previous, petsAllowed: e.target.value === "" ? undefined : e.target.value === "true" }))}><option value="">Not set</option><option value="true">Yes</option><option value="false">No</option></select>
          </div>
        </div>

        {/* Section 03: Maintenance */}
        <div className={ownerClasses("form-section")}>
          <div className={ownerClasses("form-section-header")}>
            <div className={ownerClasses("num-badge")}>03</div>
            <div className={ownerClasses("form-section-title")}>
              Maintenance Policy
            </div>
          </div>

          <div className={ownerClasses("form-grid")}>
            <div className={ownerClasses("form-group")}>
              <label className={ownerClasses("form-label")}>
                Maintenance Window
              </label>
              <input
                type="text"
                className={ownerClasses("form-input")}
                id="maintenanceWindow"
                placeholder="09:00-18:00"
                value={formData.maintenanceWindow}
                onChange={handleChange}
              />

              <span className={ownerClasses("form-hint")}>
                Time range for maintenance work
              </span>
            </div>

            <div className={ownerClasses("form-group")}>
              <label className={ownerClasses("form-label")}>
                Rent Increase Frequency
              </label>
              <select
                className={ownerClasses("form-input")}
                id="rentIncreaseFrequency"
                value={formData.rentIncreaseFrequency}
                onChange={handleChange}
              >
                <option value="">Not set</option>
                <option value="yearly">Yearly</option>
                <option value="half-yearly">Half-Yearly</option>
                <option value="never">Never</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={ownerClasses("flex-end-gap")}>
          <button
            type="button"
            className={ownerClasses("btn btn-secondary btn-lg")}
            onClick={() => setIsResetModalOpen(true)}
          >
            <Icon className={ownerClasses("icon-18 icon-middle")}>
              restart_alt
            </Icon>{" "}
            Discard changes
          </button>
          <button
            type="submit"
            className={ownerClasses("btn btn-primary btn-lg")}
          >
            <Icon className={ownerClasses("icon-18 icon-middle")}>save</Icon>{" "}
            Save Policy
          </button>
        </div>
      </form>

      {/* Reset Modal */}
      {isResetModalOpen && (
        <div
          className={ownerClasses("modal-overlay")}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsResetModalOpen(false);
          }}
        >
          <div className={ownerClasses("modal")}>
            <div className={ownerClasses("modal-header")}>
              <span className={ownerClasses("modal-title")}>
                Discard unsaved changes
              </span>
              <button
                className={ownerClasses("modal-close")}
                onClick={() => setIsResetModalOpen(false)}
              >
                ×
              </button>
            </div>
            <p className={ownerClasses("modal-desc-text")}>
              Reload your saved policy and discard unsaved changes?
            </p>
            <div className={ownerClasses("modal-footer")}>
              <button
                className={ownerClasses("btn btn-secondary")}
                onClick={() => setIsResetModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className={ownerClasses("btn btn-danger")}
                onClick={handleConfirmReset}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
