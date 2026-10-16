import { ownerClasses } from "../classes";
import Icon from "../components/Icon";
import React, { useState, useEffect } from "react";
import { changePassword } from "../services/api";

// Profile: Manage owner details, password, data export, and logout.
export default function Profile({
  profile = {},
  properties = [],
  onSaveProfile,
  onLogout,
  allData,
}) {
  const [formData, setFormData] = useState(
    Object.assign(
      {
        name: "",
        email: "",
        phone: "",
        company: "",
        bio: "",
        city: "",
        state: "",
        pincode: "",
      },
      profile,
    ),
  );

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const [passForm, setPassForm] = useState({
    currPass: "",
    newPass: "",
    confPass: "",
  });

  const [profileError, setProfileError] = useState("");
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState("");

  useEffect(() => {
    setFormData((prev) => Object.assign({}, prev, profile));
  }, [profile]);

  const totalProps = properties.length;
  const totalRevenue = properties.reduce(
    (sum, p) => sum + (p.occupiedRooms || 0) * (p.monthlyRent || 0),
    0,
  );

  const formatCurrency = (amount) => {
    return "₹" + Number(amount || 0).toLocaleString("en-IN");
  };

  const initials = (formData.name || "Owner")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleChange = (e) => {
    const id = e.target.id;
    const value = e.target.value;
    const update = {};
    update[id] = value;
    setFormData((prev) => Object.assign({}, prev, update));
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setProfileError("Full Name is required.");
      return;
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      setProfileError("A valid email address is required.");
      return;
    }

    setProfileError("");
    onSaveProfile(formData);
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!passForm.currPass || !passForm.newPass || !passForm.confPass) {
      setPassError("Please fill in all password fields.");
      return;
    }
    if (passForm.newPass.length < 8) {
      setPassError("New password must be at least 8 characters.");
      return;
    }
    if (passForm.newPass !== passForm.confPass) {
      setPassError("Passwords do not match.");
      return;
    }

    setPassError("");
    try {
      await changePassword(passForm.currPass, passForm.newPass);
      setPassSuccess("Password updated successfully!");
      setPassForm({ currPass: "", newPass: "", confPass: "" });
    } catch (error) {
      setPassError(error.message || "Could not update password");
    }
  };

  const handleDownloadData = () => {
    const exportData = allData || { profile: formData, properties: properties };
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "pg-manager-data.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Profile Hero Header Banner */}
      <div className={ownerClasses("profile-hero")}>
        <div
          className={ownerClasses("profile-avatar-large")}
          id="profileAvatarLarge"
        >
          {initials}
        </div>
        <div className={ownerClasses("profile-hero-info")}>
          <div className={ownerClasses("name")}>{formData.name || "Owner"}</div>
          <div className={ownerClasses("role")}>Property Owner</div>
          <div className={ownerClasses("email")}>
            <Icon className={ownerClasses("icon-16 icon-middle")}>email</Icon>{" "}
            {formData.email || "—"}
          </div>
        </div>
        <div className={ownerClasses("profile-stats")}>
          <div className={ownerClasses("profile-stat")}>
            <div className={ownerClasses("val")}>{totalProps}</div>
            <div className={ownerClasses("lbl")}>Properties</div>
          </div>
          <div className={ownerClasses("profile-stat")}>
            <div className={ownerClasses("val")}>
              {formatCurrency(totalRevenue)}
            </div>
            <div className={ownerClasses("lbl")}>Monthly Revenue</div>
          </div>
        </div>
      </div>

      {profileError && (
        <div className={ownerClasses("alert-danger-box")}>{profileError}</div>
      )}

      {/* Grid: Personal Info & Location/Security */}
      <div className={ownerClasses("grid-2")}>
        <div className={ownerClasses("form-section mb-0")}>
          <div className={ownerClasses("form-section-header")}>
            <div className={ownerClasses("num-badge")}>01</div>
            <div className={ownerClasses("form-section-title")}>
              Personal Information
            </div>
          </div>

          <form onSubmit={handleSaveProfile}>
            <div className={ownerClasses("flex-col-gap-16")}>
              <div className={ownerClasses("form-group")}>
                <label className={ownerClasses("form-label")}>
                  Full Name <span className={ownerClasses("req")}>*</span>
                </label>
                <input
                  className={ownerClasses("form-input")}
                  id="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  required
                />
              </div>

              <div className={ownerClasses("form-group")}>
                <label className={ownerClasses("form-label")}>
                  Email Address <span className={ownerClasses("req")}>*</span>
                </label>
                <input
                  type="email"
                  className={ownerClasses("form-input")}
                  id="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div className={ownerClasses("form-group")}>
                <label className={ownerClasses("form-label")}>
                  Phone Number
                </label>
                <input
                  className={ownerClasses("form-input")}
                  id="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 00000 00000"
                />
              </div>

              <div className={ownerClasses("form-group")}>
                <label className={ownerClasses("form-label")}>
                  Company / Business Name
                </label>
                <input
                  className={ownerClasses("form-input")}
                  id="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="Your company name"
                />
              </div>

              <div className={ownerClasses("form-group")}>
                <label className={ownerClasses("form-label")}>Bio</label>
                <textarea
                  className={ownerClasses("form-input")}
                  id="bio"
                  rows="3"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Tell us about yourself"
                ></textarea>
              </div>
            </div>

            <div className={ownerClasses("flex-gap-10 mt-20")}>
              <button
                type="submit"
                className={ownerClasses("btn btn-primary flex-1")}
              >
                <Icon className={ownerClasses("icon-16 icon-middle")}>
                  save
                </Icon>{" "}
                Save Changes
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Location & Security */}
        <div className={ownerClasses("flex-col-gap-16")}>
          <div className={ownerClasses("form-section mb-0")}>
            <div className={ownerClasses("form-section-header")}>
              <div className={ownerClasses("num-badge")}>02</div>
              <div className={ownerClasses("form-section-title")}>Location</div>
            </div>

            <div className={ownerClasses("flex-col-gap-14")}>
              <div className={ownerClasses("form-group")}>
                <label className={ownerClasses("form-label")}>City</label>
                <input
                  className={ownerClasses("form-input")}
                  id="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Chennai"
                />
              </div>

              <div className={ownerClasses("form-grid")}>
                <div className={ownerClasses("form-group")}>
                  <label className={ownerClasses("form-label")}>State</label>
                  <input
                    className={ownerClasses("form-input")}
                    id="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="Tamil Nadu"
                  />
                </div>
                <div className={ownerClasses("form-group")}>
                  <label className={ownerClasses("form-label")}>Pincode</label>
                  <input
                    className={ownerClasses("form-input")}
                    id="pincode"
                    maxLength="6"
                    value={formData.pincode}
                    onChange={handleChange}
                    placeholder="600001"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={ownerClasses("form-section mb-0")}>
            <div className={ownerClasses("form-section-header")}>
              <div className={ownerClasses("num-badge")}>03</div>
              <div className={ownerClasses("form-section-title")}>
                Security &amp; Account
              </div>
            </div>

            <div className={ownerClasses("flex-col-gap-10")}>
              <button
                className={ownerClasses("btn btn-secondary btn-start")}
                onClick={() => setIsPasswordModalOpen(true)}
              >
                <Icon className={ownerClasses("icon-18")}>lock</Icon> Change
                Password
              </button>

              <button
                className={ownerClasses("btn btn-secondary btn-start")}
                onClick={handleDownloadData}
              >
                <Icon className={ownerClasses("icon-18")}>download</Icon>{" "}
                Download My Data
              </button>

              <hr className={ownerClasses("divider")} />

              <button
                className={ownerClasses("btn btn-danger btn-start")}
                onClick={() => setIsLogoutModalOpen(true)}
              >
                <Icon className={ownerClasses("icon-18")}>logout</Icon> Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Change Password */}
      {isPasswordModalOpen && (
        <div
          className={ownerClasses("modal-overlay")}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPasswordModalOpen(false);
          }}
        >
          <div className={ownerClasses("modal")}>
            <div className={ownerClasses("modal-header")}>
              <span className={ownerClasses("modal-title")}>
                <Icon className={ownerClasses("icon-22 icon-middle icon-mr-6")}>
                  lock
                </Icon>{" "}
                Change Password
              </span>
              <button
                className={ownerClasses("modal-close")}
                onClick={() => setIsPasswordModalOpen(false)}
              >
                ×
              </button>
            </div>

            {passError && (
              <div className={ownerClasses("alert-danger-sm")}>{passError}</div>
            )}
            {passSuccess && (
              <div className={ownerClasses("alert-success-sm")}>
                {passSuccess}
              </div>
            )}

            <form onSubmit={handleUpdatePassword}>
              <div className={ownerClasses("flex-col-gap-14")}>
                <div className={ownerClasses("form-group")}>
                  <label className={ownerClasses("form-label")}>
                    Current Password
                  </label>
                  <input
                    type="password"
                    className={ownerClasses("form-input")}
                    placeholder="Enter current password"
                    value={passForm.currPass}
                    onChange={(e) => {
                      const update = { currPass: e.target.value };
                      setPassForm((prev) => Object.assign({}, prev, update));
                    }}
                  />
                </div>

                <div className={ownerClasses("form-group")}>
                  <label className={ownerClasses("form-label")}>
                    New Password
                  </label>
                  <input
                    type="password"
                    className={ownerClasses("form-input")}
                    placeholder="Min 6 characters"
                    value={passForm.newPass}
                    onChange={(e) => {
                      const update = { newPass: e.target.value };
                      setPassForm((prev) => Object.assign({}, prev, update));
                    }}
                  />
                </div>

                <div className={ownerClasses("form-group")}>
                  <label className={ownerClasses("form-label")}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    className={ownerClasses("form-input")}
                    placeholder="Repeat new password"
                    value={passForm.confPass}
                    onChange={(e) => {
                      const update = { confPass: e.target.value };
                      setPassForm((prev) => Object.assign({}, prev, update));
                    }}
                  />
                </div>
              </div>

              <div className={ownerClasses("modal-footer")}>
                <button
                  type="button"
                  className={ownerClasses("btn btn-secondary")}
                  onClick={() => setIsPasswordModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={ownerClasses("btn btn-primary")}
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Sign Out Confirmation */}
      {isLogoutModalOpen && (
        <div
          className={ownerClasses("modal-overlay")}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsLogoutModalOpen(false);
          }}
        >
          <div className={ownerClasses("modal")}>
            <div className={ownerClasses("modal-header")}>
              <span className={ownerClasses("modal-title")}>Sign Out</span>
              <button
                className={ownerClasses("modal-close")}
                onClick={() => setIsLogoutModalOpen(false)}
              >
                ×
              </button>
            </div>
            <p className={ownerClasses("modal-desc-text")}>
              Are you sure you want to sign out of the Owner Dashboard?
            </p>
            <div className={ownerClasses("modal-footer")}>
              <button
                className={ownerClasses("btn btn-secondary")}
                onClick={() => setIsLogoutModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className={ownerClasses("btn btn-danger")}
                onClick={onLogout}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
