import PropertyPhoto from "../components/PropertyPhoto";
import { ownerClasses } from "../classes";
import Icon from "../components/Icon";
import React, { useState } from "react";
import { Link } from "react-router-dom";

const AMENITY_OPTIONS = [
  "WiFi",
  "AC",
  "Laundry",
  "Parking",
  "Gym",
  "Mess",
  "Power Backup",
  "Security",
];

// Properties: Displays property listings with search, filter, view, edit, and delete
export default function Properties({
  properties = [],
  onUpdateProperty,
  onDeleteProperty,
}) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSort, setFilterSort] = useState("");

  const [viewingProperty, setViewingProperty] = useState(null);
  const [editingProperty, setEditingProperty] = useState(null);
  const [deletingProperty, setDeletingProperty] = useState(null);
  const [editError, setEditError] = useState("");
  const [editErrors, setEditErrors] = useState({});

  const formatCurrency = (amount) => {
    return "₹" + Number(amount || 0).toLocaleString("en-IN");
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
  };

  const getOccupancyPercent = (occupied = 0, total = 0) => {
    if (!total) return 0;
    return Math.round((occupied / total) * 100);
  };

  const getOccupancyClass = (pct) => {
    if (pct >= 75) return "high";
    if (pct >= 40) return "medium";
    return "low";
  };

  const filteredProperties = properties
    .filter((p) => {
      const q = search.toLowerCase().trim();
      const nameStr = (p.name || "").toLowerCase();
      const cityStr = (p.city || p.location || "").toLowerCase();
      const addrStr = (p.address || "").toLowerCase();
      const matchSearch =
        !q || nameStr.includes(q) || cityStr.includes(q) || addrStr.includes(q);
      const matchType = !filterType || p.type === filterType;
      const pStatus = (p.status || "").toLowerCase();
      const fStatus = filterStatus.toLowerCase();
      const matchStatus =
        !filterStatus ||
        pStatus === fStatus ||
        (fStatus === "active" &&
          (pStatus === "approved" || pStatus === "active")) ||
        (fStatus === "inactive" &&
          (pStatus === "pending" || pStatus === "inactive"));
      return matchSearch && matchType && matchStatus;
    })
    .sort((a, b) => {
      if (filterSort === "name") return a.name.localeCompare(b.name);
      if (filterSort === "rent_asc") return a.monthlyRent - b.monthlyRent;
      if (filterSort === "rent_desc") return b.monthlyRent - a.monthlyRent;
      if (filterSort === "occupancy") {
        const pctA = getOccupancyPercent(a.occupiedRooms, a.totalRooms);
        const pctB = getOccupancyPercent(b.occupiedRooms, b.totalRooms);
        return pctB - pctA;
      }
      return 0;
    });

  const handleToggleAmenity = (amenity) => {
    if (!editingProperty) return;
    const currentAmenities = editingProperty.amenities || [];
    const isSelected = currentAmenities.includes(amenity);

    const updatedAmenities = isSelected
      ? currentAmenities.filter((a) => a !== amenity)
      : currentAmenities.concat(amenity);

    setEditingProperty(
      Object.assign({}, editingProperty, { amenities: updatedAmenities }),
    );
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingProperty) return;

    const errors = {};
    if (!editingProperty.name || !editingProperty.name.trim()) {
      errors.name = "Property name is required. Please enter a valid property name.";
    }
    if (!editingProperty.city || !editingProperty.city.trim()) {
      errors.city = "City is required. Please specify the city where the property is located.";
    }
    if (editingProperty.monthlyRent === undefined || editingProperty.monthlyRent === "" || Number(editingProperty.monthlyRent) <= 0) {
      errors.monthlyRent = "Monthly rent must be greater than ₹0. Please enter the monthly rental amount.";
    }
    if (!editingProperty.totalRooms || Number(editingProperty.totalRooms) < 1) {
      errors.totalRooms = "Total rooms must be at least 1. Please specify how many rooms are in this property.";
    }
    if (editingProperty.occupiedRooms === undefined || editingProperty.occupiedRooms === "" || Number(editingProperty.occupiedRooms) < 0) {
      errors.occupiedRooms = "Occupied rooms cannot be negative. Enter 0 if no rooms are currently occupied.";
    } else if (Number(editingProperty.occupiedRooms) > Number(editingProperty.totalRooms)) {
      errors.occupiedRooms = `Occupied rooms (${editingProperty.occupiedRooms}) cannot exceed total rooms (${editingProperty.totalRooms}). Please reduce occupied rooms or increase total rooms.`;
    }

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      setEditError("Please correct the highlighted fields with red borders below.");
      const firstFieldId = "edit-" + Object.keys(errors)[0];
      setTimeout(() => {
        const el = document.getElementById(firstFieldId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.focus();
        }
      }, 50);
      return;
    }

    try {
      if (await onUpdateProperty(editingProperty)) {
        setEditingProperty(null);
        setEditError("");
        setEditErrors({});
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to update property";
      setEditError(Array.isArray(msg) ? msg.join(", ") : String(msg));
    }
  };

  return (
    <div>
      {/* Top Header */}
      <div className={ownerClasses("flex-between mb-20")}>
        <div>
          <div className={ownerClasses("text-sm text-muted")}>
            {filteredProperties.length} properties found
          </div>
        </div>
        <Link
          to="/owner/add-property"
          className={ownerClasses("btn btn-primary")}
        >
          <Icon className={ownerClasses("icon-18 icon-middle")}>add</Icon> Add
          Property
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className={ownerClasses("filter-bar")}>
        <div className={ownerClasses("filter-search")}>
          <Icon className={ownerClasses("icon-20 icon-muted")}>search</Icon>
          <input
            type="text"
            id="propSearch"
            placeholder="Search by name, city"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className={ownerClasses("filter-select")}
          id="filterType"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="Mixed">Mixed</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>

        <select
          className={ownerClasses("filter-select")}
          id="filterStatus"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>

        <select
          className={ownerClasses("filter-select")}
          id="filterSort"
          value={filterSort}
          onChange={(e) => setFilterSort(e.target.value)}
        >
          <option value="">Sort By</option>
          <option value="name">Name A-Z</option>
          <option value="rent_asc">Rent: Low to High</option>
          <option value="rent_desc">Rent: High to Low</option>
          <option value="occupancy">Occupancy</option>
        </select>
      </div>

      {/* Properties Grid */}
      <div className={ownerClasses("properties-grid")} id="propertiesGrid">
        {filteredProperties.length === 0 ? (
          <div className={ownerClasses("empty-state empty-state-grid")}>
            <div className={ownerClasses("empty-icon")}>
              <Icon className={ownerClasses("icon-48 icon-light")}>
                apartment
              </Icon>
            </div>
            <h3>No Properties Found</h3>
            <p>Try adjusting your search filters or add a new property.</p>
            <Link
              to="/owner/add-property"
              className={ownerClasses("btn btn-primary")}
            >
              <Icon className={ownerClasses("icon-18 icon-middle")}>add</Icon>{" "}
              Add Property
            </Link>
          </div>
        ) : (
          filteredProperties.map((p) => {
            const pct = getOccupancyPercent(p.occupiedRooms, p.totalRooms);
            const cls = getOccupancyClass(pct);
            const amenitiesShown = (p.amenities || []).slice(0, 4);
            const extraAmenities = (p.amenities || []).length - 4;

            return (
              <div
                key={p.id}
                className={ownerClasses("property-card")}
                id={`card-${p.id}`}
              >
                <div className={ownerClasses("property-card-img")}>
                  <PropertyPhoto images={p.images} name={p.name} />
                  <div
                    className={ownerClasses("property-card-status")}
                    style={{
                      display: "flex",
                      gap: "6px",
                      alignItems: "center",
                    }}
                  >
                    <span
                      className={ownerClasses(
                        `badge badge-${(p.status || "active").toLowerCase()}`,
                      )}
                    >
                      {p.status}
                    </span>
                    <span
                      className={ownerClasses("badge")}
                      style={{
                        background:
                          p.gender === "girls"
                            ? "#fdf2f8"
                            : p.gender === "boys"
                              ? "#eff6ff"
                              : "#f0fdf4",
                        color:
                          p.gender === "girls"
                            ? "#db2777"
                            : p.gender === "boys"
                              ? "#2563eb"
                              : "#16a34a",
                        border: "1px solid currentColor",
                        fontSize: "11px",
                        fontWeight: "600",
                        padding: "2px 8px",
                        borderRadius: "12px",
                      }}
                    >
                      {p.gender === "girls"
                        ? "👩 Girls Only"
                        : p.gender === "boys"
                          ? "👨 Boys Only"
                          : "👫 Co-ed"}
                    </span>
                  </div>
                </div>

                <div className={ownerClasses("property-card-body")}>
                  <div className={ownerClasses("property-card-title")}>
                    {p.name}
                  </div>
                  {p.capacityWarning && (
                    <p className={ownerClasses("text-danger")}>
                      Room occupancy exceeds recorded capacity. Please review
                      room records.
                    </p>
                  )}
                  <div className={ownerClasses("property-card-addr")}>
                    <Icon className={ownerClasses("icon-14 icon-middle")}>
                      location_on
                    </Icon>{" "}
                    {[p.address, p.city, p.state].filter(Boolean).join(", ")}
                  </div>

                  <div className={ownerClasses("property-meta")}>
                    <div className={ownerClasses("property-meta-item")}>
                      <Icon className={ownerClasses("icon-14 icon-middle")}>
                        home
                      </Icon>{" "}
                      <span>{p.type}</span>
                    </div>
                    <div className={ownerClasses("property-meta-item")}>
                      <Icon className={ownerClasses("icon-14 icon-middle")}>
                        bed
                      </Icon>{" "}
                      <span>{p.totalRooms} rooms</span>
                    </div>
                    <div className={ownerClasses("property-meta-item")}>
                      <Icon className={ownerClasses("icon-14 icon-middle")}>
                        payments
                      </Icon>{" "}
                      <span>{formatCurrency(p.monthlyRent)}/mo</span>
                    </div>
                  </div>

                  <div className={ownerClasses("occupancy-bar-wrap")}>
                    <div className={ownerClasses("occupancy-bar-label")}>
                      <span>Occupancy</span>
                      <span>
                        {p.occupiedRooms}/{p.totalRooms} ({pct}%)
                      </span>
                    </div>
                    <div className={ownerClasses("occupancy-bar")}>
                      <div
                        className={ownerClasses(`occupancy-fill ${cls}`)}
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className={ownerClasses("property-amenities")}>
                    {amenitiesShown.map((a, i) => (
                      <span key={i} className={ownerClasses("amenity-tag")}>
                        {a}
                      </span>
                    ))}
                    {extraAmenities > 0 && (
                      <span className={ownerClasses("amenity-tag")}>
                        +{extraAmenities} more
                      </span>
                    )}
                  </div>

                  <div className={ownerClasses("property-card-actions")}>
                    <button
                      className={ownerClasses(
                        "btn btn-secondary btn-sm flex-1",
                      )}
                      onClick={() => setViewingProperty(p)}
                    >
                      <Icon className={ownerClasses("icon-16 icon-middle")}>
                        visibility
                      </Icon>{" "}
                      View
                    </button>
                    <button
                      className={ownerClasses(
                        "btn btn-secondary btn-sm flex-1",
                      )}
                      onClick={() => {
                        setEditingProperty(Object.assign({}, p));
                        setEditError("");
                        setEditErrors({});
                      }}
                    >
                      <Icon className={ownerClasses("icon-16 icon-middle")}>
                        edit
                      </Icon>{" "}
                      Edit
                    </button>
                    <button
                      className={ownerClasses("btn btn-danger btn-sm")}
                      onClick={() => setDeletingProperty(p)}
                    >
                      <Icon className={ownerClasses("icon-16 icon-middle")}>
                        delete
                      </Icon>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: View Property Details */}
      {viewingProperty && (
        <div
          className={ownerClasses("modal-overlay")}
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingProperty(null);
          }}
        >
          <div className={ownerClasses("modal")}>
            <div className={ownerClasses("modal-header")}>
              <span className={ownerClasses("modal-title")}>
                <Icon className={ownerClasses("icon-22 icon-middle icon-mr-6")}>
                  apartment
                </Icon>{" "}
                {viewingProperty.name}
              </span>
              <button
                className={ownerClasses("modal-close")}
                onClick={() => setViewingProperty(null)}
              >
                ×
              </button>
            </div>

            <div className={ownerClasses("flex-col-gap-12")}>
              <div
                style={{
                  height: "180px",
                  borderRadius: "12px",
                  overflow: "hidden",
                  marginBottom: "8px",
                  background: "#f1f5f9",
                }}
              >
                <PropertyPhoto
                  images={viewingProperty.images}
                  name={viewingProperty.name}
                />
              </div>

              <div className={ownerClasses("grid-2-details")}>
                <div>
                  <div className={ownerClasses("text-xs text-muted")}>
                    Address
                  </div>
                  <div className={ownerClasses("font-bold text-sm")}>
                    {viewingProperty.address}, {viewingProperty.city}
                  </div>
                </div>
                <div>
                  <div className={ownerClasses("text-xs text-muted")}>
                    State / PIN
                  </div>
                  <div className={ownerClasses("font-bold text-sm")}>
                    {viewingProperty.state} — {viewingProperty.pincode}
                  </div>
                </div>
                <div>
                  <div className={ownerClasses("text-xs text-muted")}>Type</div>
                  <div className={ownerClasses("font-bold text-sm")}>
                    {viewingProperty.type}
                  </div>
                </div>
                <div>
                  <div className={ownerClasses("text-xs text-muted")}>
                    Gender Policy
                  </div>
                  <div
                    className={ownerClasses("font-bold text-sm")}
                    style={{ textTransform: "capitalize" }}
                  >
                    {viewingProperty.gender === "girls"
                      ? "👩 Girls Only"
                      : viewingProperty.gender === "boys"
                        ? "👨 Boys Only"
                        : "👫 Co-ed"}
                  </div>
                </div>
                <div>
                  <div className={ownerClasses("text-xs text-muted")}>
                    Status
                  </div>
                  <span
                    className={ownerClasses(
                      `badge badge-${(viewingProperty.status || "active").toLowerCase()}`,
                    )}
                  >
                    {viewingProperty.status}
                  </span>
                </div>
                <div>
                  <div className={ownerClasses("text-xs text-muted")}>
                    Total Rooms
                  </div>
                  <div className={ownerClasses("font-bold text-sm")}>
                    {viewingProperty.totalRooms}
                  </div>
                </div>
                <div>
                  <div className={ownerClasses("text-xs text-muted")}>
                    Occupied
                  </div>
                  <div className={ownerClasses("font-bold text-sm")}>
                    {viewingProperty.occupiedRooms} (
                    {getOccupancyPercent(
                      viewingProperty.occupiedRooms,
                      viewingProperty.totalRooms,
                    )}
                    %)
                  </div>
                </div>
                <div>
                  <div className={ownerClasses("text-xs text-muted")}>
                    Monthly Rent
                  </div>
                  <div
                    className={ownerClasses(
                      "font-bold text-sm text-primary-cost",
                    )}
                  >
                    {formatCurrency(viewingProperty.monthlyRent)}
                  </div>
                </div>
                <div>
                  <div className={ownerClasses("text-xs text-muted")}>
                    Added
                  </div>
                  <div className={ownerClasses("font-bold text-sm")}>
                    {formatDate(viewingProperty.addedDate)}
                  </div>
                </div>
              </div>

              <div>
                <div className={ownerClasses("text-xs text-muted mb-8")}>
                  Amenities
                </div>
                <div className={ownerClasses("property-amenities")}>
                  {(viewingProperty.amenities || []).map((a, i) => (
                    <span key={i} className={ownerClasses("amenity-tag")}>
                      {a}
                    </span>
                  ))}
                </div>
              </div>

              <div className={ownerClasses("occupancy-bar-wrap")}>
                <div className={ownerClasses("occupancy-bar-label")}>
                  <span>Occupancy</span>
                  <span>
                    {getOccupancyPercent(
                      viewingProperty.occupiedRooms,
                      viewingProperty.totalRooms,
                    )}
                    %
                  </span>
                </div>
                <div className={ownerClasses("occupancy-bar")}>
                  <div
                    className={ownerClasses(
                      `occupancy-fill ${getOccupancyClass(getOccupancyPercent(viewingProperty.occupiedRooms, viewingProperty.totalRooms))}`,
                    )}
                  ></div>
                </div>
              </div>
            </div>

            <div className={ownerClasses("modal-footer")}>
              <button
                className={ownerClasses("btn btn-secondary")}
                onClick={() => setViewingProperty(null)}
              >
                Close
              </button>
              <button
                className={ownerClasses("btn btn-primary")}
                onClick={() => {
                  setEditingProperty(Object.assign({}, viewingProperty));
                  setEditError("");
                  setEditErrors({});
                  setViewingProperty(null);
                }}
              >
                <Icon className={ownerClasses("icon-16 icon-middle")}>
                  edit
                </Icon>{" "}
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Property */}
      {editingProperty && (
        <div
          className={ownerClasses("modal-overlay")}
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingProperty(null);
          }}
        >
          <div className={ownerClasses("modal")}>
            <div className={ownerClasses("modal-header")}>
              <span className={ownerClasses("modal-title")}>
                <Icon className={ownerClasses("icon-22 icon-middle icon-mr-6")}>
                  edit
                </Icon>{" "}
                Edit Property
              </span>
              <button
                className={ownerClasses("modal-close")}
                onClick={() => setEditingProperty(null)}
              >
                ×
              </button>
            </div>

            {editError && (
              <div className={ownerClasses("form-error-banner mb-16")}>
                <Icon className={ownerClasses("icon-20")}>report_problem</Icon>
                <div>
                  <div className={ownerClasses("form-error-banner-title")}>
                    Please fix the highlighted fields
                  </div>
                  <div>{editError}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveEdit} noValidate>
              <div className={ownerClasses("modal-form-scroll")}>
                <div className={ownerClasses("form-grid")}>
                  <div className={ownerClasses("form-group")}>
                    <label className={ownerClasses("form-label")}>
                      Property Name *
                    </label>
                    <input
                      id="edit-name"
                      className={ownerClasses(
                        `form-input ${editErrors.name ? "has-error input-error" : ""}`,
                      )}
                      value={editingProperty.name}
                      onChange={(e) => {
                        const update = { name: e.target.value };
                        setEditingProperty((prev) =>
                          Object.assign({}, prev, update),
                        );
                        if (editErrors.name) {
                          setEditErrors((prev) => ({ ...prev, name: undefined }));
                        }
                      }}
                      placeholder="e.g. Sunshine PG"
                    />
                    {editErrors.name && (
                      <div className={ownerClasses("field-error-msg")}>
                        <Icon className={ownerClasses("icon-16")}>error_outline</Icon>
                        <span>{editErrors.name}</span>
                      </div>
                    )}
                  </div>

                  <div className={ownerClasses("form-group")}>
                    <label className={ownerClasses("form-label")}>Type</label>
                    <select
                      className={ownerClasses("form-input")}
                      value={editingProperty.type}
                      onChange={(e) => {
                        const update = { type: e.target.value };
                        setEditingProperty((prev) =>
                          Object.assign({}, prev, update),
                        );
                      }}
                    >
                      <option value="Mixed">Mixed</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  <div className={ownerClasses("form-group")}>
                    <label className={ownerClasses("form-label")}>
                      Gender Policy
                    </label>
                    <select
                      className={ownerClasses("form-input")}
                      value={editingProperty.gender || "unisex"}
                      onChange={(e) => {
                        const update = { gender: e.target.value };
                        setEditingProperty((prev) =>
                          Object.assign({}, prev, update),
                        );
                      }}
                    >
                      <option value="unisex">Co-ed (All Welcome)</option>
                      <option value="boys">Boys Only</option>
                      <option value="girls">Girls Only</option>
                    </select>
                  </div>

                  <div className={ownerClasses("form-group")}>
                    <label className={ownerClasses("form-label")}>City *</label>
                    <input
                      id="edit-city"
                      className={ownerClasses(
                        `form-input ${editErrors.city ? "has-error input-error" : ""}`,
                      )}
                      value={editingProperty.city}
                      onChange={(e) => {
                        const update = { city: e.target.value };
                        setEditingProperty((prev) =>
                          Object.assign({}, prev, update),
                        );
                        if (editErrors.city) {
                          setEditErrors((prev) => ({ ...prev, city: undefined }));
                        }
                      }}
                      placeholder="e.g. Bangalore"
                    />
                    {editErrors.city && (
                      <div className={ownerClasses("field-error-msg")}>
                        <Icon className={ownerClasses("icon-16")}>error_outline</Icon>
                        <span>{editErrors.city}</span>
                      </div>
                    )}
                  </div>

                  <div className={ownerClasses("form-group")}>
                    <label className={ownerClasses("form-label")}>
                      Monthly Rent (₹) *
                    </label>
                    <input
                      id="edit-monthlyRent"
                      type="number"
                      className={ownerClasses(
                        `form-input ${editErrors.monthlyRent ? "has-error input-error" : ""}`,
                      )}
                      value={editingProperty.monthlyRent}
                      onChange={(e) => {
                        const update = { monthlyRent: Number(e.target.value) };
                        setEditingProperty((prev) =>
                          Object.assign({}, prev, update),
                        );
                        if (editErrors.monthlyRent) {
                          setEditErrors((prev) => ({ ...prev, monthlyRent: undefined }));
                        }
                      }}
                      min="0"
                    />
                    {editErrors.monthlyRent && (
                      <div className={ownerClasses("field-error-msg")}>
                        <Icon className={ownerClasses("icon-16")}>error_outline</Icon>
                        <span>{editErrors.monthlyRent}</span>
                      </div>
                    )}
                  </div>

                  <div className={ownerClasses("form-group")}>
                    <label className={ownerClasses("form-label")}>
                      Total Rooms *
                    </label>
                    <input
                      id="edit-totalRooms"
                      type="number"
                      className={ownerClasses(
                        `form-input ${editErrors.totalRooms ? "has-error input-error" : ""}`,
                      )}
                      disabled={editingProperty.hasRoomRecords}
                      value={editingProperty.totalRooms}
                      onChange={(e) => {
                        const update = { totalRooms: Number(e.target.value) };
                        setEditingProperty((prev) =>
                          Object.assign({}, prev, update),
                        );
                        if (editErrors.totalRooms) {
                          setEditErrors((prev) => ({ ...prev, totalRooms: undefined }));
                        }
                      }}
                      min="1"
                    />
                    {editErrors.totalRooms && (
                      <div className={ownerClasses("field-error-msg")}>
                        <Icon className={ownerClasses("icon-16")}>error_outline</Icon>
                        <span>{editErrors.totalRooms}</span>
                      </div>
                    )}
                  </div>

                  <div className={ownerClasses("form-group")}>
                    <label className={ownerClasses("form-label")}>
                      Occupied Rooms
                    </label>
                    <input
                      id="edit-occupiedRooms"
                      type="number"
                      className={ownerClasses(
                        `form-input ${editErrors.occupiedRooms ? "has-error input-error" : ""}`,
                      )}
                      disabled={editingProperty.hasRoomRecords}
                      value={editingProperty.occupiedRooms}
                      onChange={(e) => {
                        const update = {
                          occupiedRooms: Number(e.target.value),
                        };
                        setEditingProperty((prev) =>
                          Object.assign({}, prev, update),
                        );
                        if (editErrors.occupiedRooms) {
                          setEditErrors((prev) => ({ ...prev, occupiedRooms: undefined }));
                        }
                      }}
                      min="0"
                    />
                    {editErrors.occupiedRooms && (
                      <div className={ownerClasses("field-error-msg")}>
                        <Icon className={ownerClasses("icon-16")}>error_outline</Icon>
                        <span>{editErrors.occupiedRooms}</span>
                      </div>
                    )}
                  </div>

                  <div className={ownerClasses("form-group")}>
                    <label className={ownerClasses("form-label")}>Status</label>
                    <select
                      className={ownerClasses("form-input")}
                      value={editingProperty.status}
                      onChange={(e) => {
                        const update = { status: e.target.value };
                        setEditingProperty((prev) =>
                          Object.assign({}, prev, update),
                        );
                      }}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={ownerClasses("form-label")}>
                    Photo URLs (one per line)
                  </label>
                  <textarea
                    className={ownerClasses("form-input")}
                    value={(editingProperty.images || []).join("\n")}
                    onChange={(e) =>
                      setEditingProperty((previous) => ({
                        ...previous,
                        images: e.target.value.split("\n"),
                      }))
                    }
                  />
                  {editingProperty.hasRoomRecords && (
                    <p>Room counts are calculated from saved room records.</p>
                  )}
                  <div className={ownerClasses("form-label mb-8")}>
                    Amenities
                  </div>
                  <div className={ownerClasses("amenities-grid")}>
                    {AMENITY_OPTIONS.map((a) => {
                      const isSelected = (
                        editingProperty.amenities || []
                      ).includes(a);
                      return (
                        <div
                          key={a}
                          className={ownerClasses(
                            `amenity-toggle ${isSelected ? "selected" : ""}`,
                          )}
                          onClick={() => handleToggleAmenity(a)}
                        >
                          {a}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className={ownerClasses("modal-footer")}>
                <button
                  type="button"
                  className={ownerClasses("btn btn-secondary")}
                  onClick={() => setEditingProperty(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={ownerClasses("btn btn-primary")}
                >
                  <Icon className={ownerClasses("icon-16 icon-middle")}>
                    save
                  </Icon>{" "}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Property Confirmation */}
      {deletingProperty && (
        <div
          className={ownerClasses("modal-overlay")}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeletingProperty(null);
          }}
        >
          <div className={ownerClasses("modal")}>
            <div className={ownerClasses("modal-header")}>
              <span className={ownerClasses("modal-title")}>
                Delete Property
              </span>
              <button
                className={ownerClasses("modal-close")}
                onClick={() => setDeletingProperty(null)}
              >
                ×
              </button>
            </div>
            <p className={ownerClasses("modal-desc-text")}>
              Are you sure you want to delete "
              <strong>{deletingProperty.name}</strong>"? This action cannot be
              undone.
            </p>
            <div className={ownerClasses("modal-footer")}>
              <button
                className={ownerClasses("btn btn-secondary")}
                onClick={() => setDeletingProperty(null)}
              >
                Cancel
              </button>
              <button
                className={ownerClasses("btn btn-danger")}
                onClick={() => {
                  onDeleteProperty(deletingProperty.id);
                  setDeletingProperty(null);
                }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
