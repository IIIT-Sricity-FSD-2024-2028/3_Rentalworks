import { ownerClasses } from "../classes";
import Icon from "../components/Icon";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const AMENITY_LIST = [
  { label: "WiFi", icon: "wifi" },
  { label: "AC", icon: "ac_unit" },
  { label: "Laundry", icon: "local_laundry_service" },
  { label: "Parking", icon: "local_parking" },
  { label: "Gym", icon: "fitness_center" },
  { label: "Mess", icon: "restaurant" },
  { label: "Power Backup", icon: "power" },
  { label: "Security", icon: "lock" },
];

// AddProperty: Controlled form with validation to add a new property
export default function AddProperty({ onAddProperty }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    photoUrls: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    type: "",
    gender: "unisex",
    capacity: "",
    rooms: "",
    rent: "",
    occupied: 0,
    status: "Active",
    description: "",
  });

  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const id = e.target.id;
    const value = e.target.value;
    const update = {};
    update[id] = value;
    setFormData((prev) => Object.assign({}, prev, update));
    if (errors[id]) {
      const errUpdate = {};
      errUpdate[id] = "";
      setErrors((prev) => Object.assign({}, prev, errUpdate));
    }
  };

  const toggleAmenity = (label) => {
    setSelectedAmenities((prev) => {
      if (prev.includes(label)) {
        return prev.filter((item) => item !== label);
      }
      return prev.concat(label);
    });
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = "Property Name is required. Please enter the property's name.";
    }
    if (!formData.address.trim()) {
      newErrors.address = "Address is required. Please enter the street or building address.";
    }
    if (!formData.city.trim()) {
      newErrors.city = "City is required. Please enter the city where property is located.";
    }
    if (!formData.state.trim()) {
      newErrors.state = "State is required. Please enter the state name.";
    }

    if (!/^\d{6}$/.test(formData.pincode.trim())) {
      newErrors.pincode = "Invalid Pincode. Please enter an exact 6-digit postal code (e.g. 600001).";
    }

    if (!formData.type) {
      newErrors.type = "Property Type is required. Please choose Mixed, Male Only, or Female Only.";
    }
    if (!formData.capacity || Number(formData.capacity) < 1) {
      newErrors.capacity = "Total Capacity is required. Please enter maximum tenant capacity (at least 1).";
    }
    if (!formData.rooms || Number(formData.rooms) < 1) {
      newErrors.rooms = "Total Rooms is required. Please enter the number of rooms (at least 1 room).";
    }
    if (!formData.rent || Number(formData.rent) < 0) {
      newErrors.rent = "Monthly Rent is required. Please enter monthly rent in ₹ (e.g. 8000).";
    }
    if (Number(formData.occupied) > Number(formData.rooms)) {
      newErrors.occupied = "Occupancy exceeds rooms. Occupied rooms cannot be greater than Total Rooms.";
    }

    setErrors(newErrors);

    const errorKeys = Object.keys(newErrors);
    if (errorKeys.length > 0) {
      setTimeout(() => {
        const firstField = document.getElementById(errorKeys[0]);
        if (firstField) {
          firstField.scrollIntoView({ behavior: "smooth", block: "center" });
          firstField.focus();
        }
      }, 60);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    const newProperty = {
      id: "prop_" + Date.now(),
      name: formData.name.trim(),
      address: formData.address.trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      pincode: formData.pincode.trim(),
      type: formData.type,
      gender:
        formData.gender ||
        (formData.type === "Female"
          ? "girls"
          : formData.type === "Male"
            ? "boys"
            : "unisex"),
      totalCapacity: Number(formData.capacity),
      totalRooms: Number(formData.rooms),
      rooms: String(formData.rooms),
      occupiedRooms: Number(formData.occupied) || 0,
      monthlyRent: Number(formData.rent),
      amenities: selectedAmenities,
      images: formData.photoUrls
        .split("\n")
        .map((url) => url.trim())
        .filter(Boolean),
      status: formData.status,
      addedDate: new Date().toISOString().split("T")[0],
      description: formData.description.trim(),
    };

    try {
      await onAddProperty(newProperty);
      navigate("/owner/properties");
    } catch (err) {
      const serverMsg = (err?.message || "").toLowerCase();
      const mappedErrors = {};
      if (serverMsg.includes("room")) {
        mappedErrors.rooms = "Total Rooms is required. Please enter a valid number of rooms (e.g. 10).";
      }
      if (serverMsg.includes("rent")) {
        mappedErrors.rent = "Monthly Rent is required. Please enter a valid rent in ₹.";
      }
      if (serverMsg.includes("name")) {
        mappedErrors.name = "Property Name is invalid. Please enter a valid property name.";
      }
      if (serverMsg.includes("pincode")) {
        mappedErrors.pincode = "Pincode is invalid. Please enter a valid 6-digit postal code.";
      }
      if (serverMsg.includes("capacity")) {
        mappedErrors.capacity = "Total Capacity is invalid. Please enter a capacity of 1 or more.";
      }
      if (Object.keys(mappedErrors).length > 0) {
        setErrors((prev) => Object.assign({}, prev, mappedErrors));
        const firstKey = Object.keys(mappedErrors)[0];
        setTimeout(() => {
          const el = document.getElementById(firstKey);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.focus();
          }
        }, 60);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className={ownerClasses("page-header")}>
        <Link to="/owner/properties" className={ownerClasses("back-link")}>
          ← Back to Properties
        </Link>
        <h1>Add New Property</h1>
        <p>Submit property details for system verification</p>
      </div>

      <form onSubmit={handleSubmit}>
        {Object.keys(errors).length > 0 && (
          <div className={ownerClasses("form-error-banner")}>
            <Icon className={ownerClasses("icon-22 icon-middle")}>warning</Icon>
            <div>
              <strong>Please review and correct the highlighted fields:</strong>
              <div style={{ marginTop: "4px", fontSize: "13px", opacity: 0.9 }}>
                {Object.values(errors)[0]}
              </div>
            </div>
          </div>
        )}

        {/* Section 01: Basic Information */}
        <div className={ownerClasses("form-section")}>
          <div className={ownerClasses("form-section-header")}>
            <div className={ownerClasses("num-badge")}>01</div>
            <div className={ownerClasses("form-section-title")}>
              Basic Information
            </div>
          </div>

          <div className={ownerClasses("form-grid")}>
            <div
              className={ownerClasses(
                errors.name ? "form-group has-error" : "form-group",
              )}
            >
              <label className={ownerClasses("form-label")}>
                Property Name <span className={ownerClasses("req")}>*</span>
              </label>
              <input
                type="text"
                className={ownerClasses(
                  errors.name ? "form-input has-error input-error" : "form-input",
                )}
                id="name"
                placeholder="e.g. Sunrise PG"
                value={formData.name}
                onChange={handleChange}
              />

              {errors.name && (
                <div className={ownerClasses("field-error-msg")}>
                  <Icon className={ownerClasses("icon-16 icon-middle")}>
                    error_outline
                  </Icon>
                  <span>{errors.name}</span>
                </div>
              )}
            </div>

            <div
              className={ownerClasses(
                errors.address ? "form-group has-error" : "form-group",
              )}
            >
              <label className={ownerClasses("form-label")}>
                Address <span className={ownerClasses("req")}>*</span>
              </label>
              <input
                type="text"
                className={ownerClasses(
                  errors.address ? "form-input has-error input-error" : "form-input",
                )}
                id="address"
                placeholder="Street address"
                value={formData.address}
                onChange={handleChange}
              />

              {errors.address && (
                <div className={ownerClasses("field-error-msg")}>
                  <Icon className={ownerClasses("icon-16 icon-middle")}>
                    error_outline
                  </Icon>
                  <span>{errors.address}</span>
                </div>
              )}
            </div>

            <div
              className={ownerClasses(
                errors.city ? "form-group has-error" : "form-group",
              )}
            >
              <label className={ownerClasses("form-label")}>
                City <span className={ownerClasses("req")}>*</span>
              </label>
              <input
                type="text"
                className={ownerClasses(
                  errors.city ? "form-input has-error input-error" : "form-input",
                )}
                id="city"
                placeholder="Chennai"
                value={formData.city}
                onChange={handleChange}
              />

              {errors.city && (
                <div className={ownerClasses("field-error-msg")}>
                  <Icon className={ownerClasses("icon-16 icon-middle")}>
                    error_outline
                  </Icon>
                  <span>{errors.city}</span>
                </div>
              )}
            </div>

            <div
              className={ownerClasses(
                errors.state ? "form-group has-error" : "form-group",
              )}
            >
              <label className={ownerClasses("form-label")}>
                State <span className={ownerClasses("req")}>*</span>
              </label>
              <input
                type="text"
                className={ownerClasses(
                  errors.state ? "form-input has-error input-error" : "form-input",
                )}
                id="state"
                placeholder="Tamil Nadu"
                value={formData.state}
                onChange={handleChange}
              />

              {errors.state && (
                <div className={ownerClasses("field-error-msg")}>
                  <Icon className={ownerClasses("icon-16 icon-middle")}>
                    error_outline
                  </Icon>
                  <span>{errors.state}</span>
                </div>
              )}
            </div>

            <div
              className={ownerClasses(
                errors.pincode ? "form-group has-error" : "form-group",
              )}
            >
              <label className={ownerClasses("form-label")}>
                Pincode <span className={ownerClasses("req")}>*</span>
              </label>
              <input
                type="text"
                className={ownerClasses(
                  errors.pincode ? "form-input has-error input-error" : "form-input",
                )}
                id="pincode"
                placeholder="600001"
                maxLength="6"
                value={formData.pincode}
                onChange={handleChange}
              />

              {errors.pincode && (
                <div className={ownerClasses("field-error-msg")}>
                  <Icon className={ownerClasses("icon-16 icon-middle")}>
                    error_outline
                  </Icon>
                  <span>{errors.pincode}</span>
                </div>
              )}
            </div>

            <div
              className={ownerClasses(
                errors.type ? "form-group has-error" : "form-group",
              )}
            >
              <label className={ownerClasses("form-label")}>
                Property Type <span className={ownerClasses("req")}>*</span>
              </label>
              <select
                className={ownerClasses(
                  errors.type ? "form-input has-error input-error" : "form-input",
                )}
                id="type"
                value={formData.type}
                onChange={handleChange}
              >
                <option value="">Select type</option>
                <option value="Mixed">Mixed (Male &amp; Female)</option>
                <option value="Male">Male Only</option>
                <option value="Female">Female Only</option>
              </select>
              {errors.type && (
                <div className={ownerClasses("field-error-msg")}>
                  <Icon className={ownerClasses("icon-16 icon-middle")}>
                    error_outline
                  </Icon>
                  <span>{errors.type}</span>
                </div>
              )}
            </div>

            <div className={ownerClasses("form-group")}>
              <label className={ownerClasses("form-label")}>
                Gender Policy <span className={ownerClasses("req")}>*</span>
              </label>
              <select
                className={ownerClasses("form-input")}
                id="gender"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="unisex">Co-ed (All Genders Eligible)</option>
                <option value="boys">Boys Only (Male Tenants Only)</option>
                <option value="girls">Girls Only (Female Tenants Only)</option>
              </select>
              <span
                className={ownerClasses("text-xs text-muted")}
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  marginTop: "4px",
                  display: "block",
                }}
              >
                Enforced by backend booking verification
              </span>
            </div>
          </div>
        </div>

        {/* Section 02: Details */}
        <div className={ownerClasses("form-section")}>
          <div className={ownerClasses("form-section-header")}>
            <div className={ownerClasses("num-badge")}>02</div>
            <div className={ownerClasses("form-section-title")}>
              Property Details
            </div>
          </div>

          <div className={ownerClasses("form-grid-3")}>
            <div
              className={ownerClasses(
                errors.capacity ? "form-group has-error" : "form-group",
              )}
            >
              <label className={ownerClasses("form-label")}>
                Total Capacity <span className={ownerClasses("req")}>*</span>
              </label>
              <input
                type="number"
                className={ownerClasses(
                  errors.capacity ? "form-input has-error input-error" : "form-input",
                )}
                id="capacity"
                placeholder="20"
                min="1"
                value={formData.capacity}
                onChange={handleChange}
              />

              {errors.capacity && (
                <div className={ownerClasses("field-error-msg")}>
                  <Icon className={ownerClasses("icon-16 icon-middle")}>
                    error_outline
                  </Icon>
                  <span>{errors.capacity}</span>
                </div>
              )}
            </div>

            <div
              className={ownerClasses(
                errors.rooms ? "form-group has-error" : "form-group",
              )}
            >
              <label className={ownerClasses("form-label")}>
                Total Rooms <span className={ownerClasses("req")}>*</span>
              </label>
              <input
                type="number"
                className={ownerClasses(
                  errors.rooms ? "form-input has-error input-error" : "form-input",
                )}
                id="rooms"
                placeholder="10"
                min="1"
                value={formData.rooms}
                onChange={handleChange}
              />

              {errors.rooms && (
                <div className={ownerClasses("field-error-msg")}>
                  <Icon className={ownerClasses("icon-16 icon-middle")}>
                    error_outline
                  </Icon>
                  <span>{errors.rooms}</span>
                </div>
              )}
            </div>

            <div
              className={ownerClasses(
                errors.rent ? "form-group has-error" : "form-group",
              )}
            >
              <label className={ownerClasses("form-label")}>
                Monthly Rent (₹) <span className={ownerClasses("req")}>*</span>
              </label>
              <input
                type="number"
                className={ownerClasses(
                  errors.rent ? "form-input has-error input-error" : "form-input",
                )}
                id="rent"
                placeholder="8000"
                min="0"
                value={formData.rent}
                onChange={handleChange}
              />

              {errors.rent && (
                <div className={ownerClasses("field-error-msg")}>
                  <Icon className={ownerClasses("icon-16 icon-middle")}>
                    error_outline
                  </Icon>
                  <span>{errors.rent}</span>
                </div>
              )}
            </div>

            <div
              className={ownerClasses(
                errors.occupied ? "form-group has-error" : "form-group",
              )}
            >
              <label className={ownerClasses("form-label")}>
                Currently Occupied
              </label>
              <input
                type="number"
                className={ownerClasses(
                  errors.occupied ? "form-input has-error input-error" : "form-input",
                )}
                id="occupied"
                placeholder="0"
                min="0"
                value={formData.occupied}
                onChange={handleChange}
              />

              {errors.occupied && (
                <div className={ownerClasses("field-error-msg")}>
                  <Icon className={ownerClasses("icon-16 icon-middle")}>
                    error_outline
                  </Icon>
                  <span>{errors.occupied}</span>
                </div>
              )}
            </div>

            <div className={ownerClasses("form-group")}>
              <label className={ownerClasses("form-label")}>Status</label>
              <select
                className={ownerClasses("form-input")}
                id="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 03: Amenities */}
        <div className={ownerClasses("form-section")}>
          <div className={ownerClasses("form-section-header")}>
            <div className={ownerClasses("num-badge")}>03</div>
            <div className={ownerClasses("form-section-title")}>Amenities</div>
          </div>

          <div className={ownerClasses("amenities-grid")} id="amenitiesGrid">
            {AMENITY_LIST.map((a) => {
              const isSelected = selectedAmenities.includes(a.label);
              return (
                <div
                  key={a.label}
                  className={ownerClasses(
                    `amenity-toggle ${isSelected ? "selected" : ""}`,
                  )}
                  onClick={() => toggleAmenity(a.label)}
                >
                  <Icon className={ownerClasses("icon-16")}>{a.icon}</Icon>{" "}
                  {a.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 04: Description */}
        <div className={ownerClasses("form-section")}>
          <div className={ownerClasses("form-section-header")}>
            <div className={ownerClasses("num-badge")}>04</div>
            <div className={ownerClasses("form-section-title")}>
              Additional Notes{" "}
              <span className={ownerClasses("prop-sub-row")}>(Optional)</span>
            </div>
          </div>

          <div className={ownerClasses("form-group")}>
            <label className={ownerClasses("form-label")}>
              Property Description
            </label>
            <textarea
              className={ownerClasses("form-input")}
              id="description"
              placeholder="Enter any additional details about the property, rules, nearby landmarks"
              rows="4"
              value={formData.description}
              onChange={handleChange}
            ></textarea>
          </div>
        </div>

        <div className={ownerClasses("form-group")}>
          <label className={ownerClasses("form-label")} htmlFor="photoUrls">
            Photo URLs (one per line)
          </label>
          <textarea
            id="photoUrls"
            className={ownerClasses("form-input")}
            value={formData.photoUrls}
            onChange={handleChange}
            placeholder="https://..."
          />
        </div>
        {/* Action Buttons */}
        <div className={ownerClasses("flex-end-gap mt-8")}>
          <Link
            to="/owner/properties"
            className={ownerClasses("btn btn-secondary btn-lg")}
          >
            Cancel
          </Link>
          <button
            type="submit"
            className={ownerClasses("btn btn-primary btn-lg")}
            id="submitBtn"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              "Submitting..."
            ) : (
              <>
                <Icon className={ownerClasses("icon-18 icon-middle")}>
                  check
                </Icon>{" "}
                Submit for Verification
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
