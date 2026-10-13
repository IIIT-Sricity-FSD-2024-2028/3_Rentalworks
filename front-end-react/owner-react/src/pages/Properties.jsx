import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const AMENITY_OPTIONS = [
  'WiFi',
  'AC',
  'Laundry',
  'Parking',
  'Gym',
  'Mess',
  'Power Backup',
  'Security',
];

// Properties: Displays property listings with search, filter, view, edit, and delete
export default function Properties({
  properties = [],
  onUpdateProperty,
  onDeleteProperty,
}) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSort, setFilterSort] = useState('');

  const [viewingProperty, setViewingProperty] = useState(null);
  const [editingProperty, setEditingProperty] = useState(null);
  const [deletingProperty, setDeletingProperty] = useState(null);
  const [editError, setEditError] = useState('');

  const formatCurrency = (amount) => {
    return '₹' + Number(amount || 0).toLocaleString('en-IN');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getOccupancyPercent = (occupied = 0, total = 0) => {
    if (!total) return 0;
    return Math.round((occupied / total) * 100);
  };

  const getOccupancyClass = (pct) => {
    if (pct >= 75) return 'high';
    if (pct >= 40) return 'medium';
    return 'low';
  };

  const filteredProperties = properties
    .filter((p) => {
      const q = search.toLowerCase().trim();
      const nameStr = (p.name || '').toLowerCase();
      const cityStr = (p.city || p.location || '').toLowerCase();
      const addrStr = (p.address || '').toLowerCase();
      const matchSearch =
        !q ||
        nameStr.includes(q) ||
        cityStr.includes(q) ||
        addrStr.includes(q);
      const matchType = !filterType || p.type === filterType;
      const pStatus = (p.status || '').toLowerCase();
      const fStatus = filterStatus.toLowerCase();
      const matchStatus =
        !filterStatus ||
        pStatus === fStatus ||
        (fStatus === 'active' && (pStatus === 'approved' || pStatus === 'active')) ||
        (fStatus === 'inactive' && (pStatus === 'pending' || pStatus === 'inactive'));
      return matchSearch && matchType && matchStatus;
    })
    .sort((a, b) => {
      if (filterSort === 'name') return a.name.localeCompare(b.name);
      if (filterSort === 'rent_asc') return a.monthlyRent - b.monthlyRent;
      if (filterSort === 'rent_desc') return b.monthlyRent - a.monthlyRent;
      if (filterSort === 'occupancy') {
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
      Object.assign({}, editingProperty, { amenities: updatedAmenities })
    );
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingProperty) return;

    if (!editingProperty.name.trim() || !editingProperty.city.trim()) {
      setEditError('Please fill in all required fields.');
      return;
    }

    if (editingProperty.occupiedRooms > editingProperty.totalRooms) {
      setEditError('Occupied rooms cannot exceed total rooms.');
      return;
    }

    onUpdateProperty(editingProperty);
    setEditingProperty(null);
    setEditError('');
  };

  return (
    <div>
      {/* Top Header */}
      <div className="flex-between mb-20">
        <div>
          <div className="text-sm text-muted">
            {filteredProperties.length} properties found
          </div>
        </div>
        <Link to="/add-property" className="btn btn-primary">
          <span className="material-icons icon-18 icon-middle">add</span>{' '}
          Add Property
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="filter-search">
          <span className="material-icons icon-20 icon-muted">search</span>
          <input
            type="text"
            id="propSearch"
            placeholder="Search by name, city"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
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
          className="filter-select"
          id="filterStatus"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>

        <select
          className="filter-select"
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
      <div className="properties-grid" id="propertiesGrid">
        {filteredProperties.length === 0 ? (
          <div className="empty-state empty-state-grid">
            <div className="empty-icon">
              <span className="material-icons icon-48 icon-light">apartment</span>
            </div>
            <h3>No Properties Found</h3>
            <p>Try adjusting your search filters or add a new property.</p>
            <Link to="/add-property" className="btn btn-primary">
              <span className="material-icons icon-18 icon-middle">add</span>{' '}
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
              <div key={p.id} className="property-card" id={`card-${p.id}`}>
                <div className="property-card-img">
                  <span className="material-icons prop-bg-icon">
                    apartment
                  </span>
                  <div className="property-card-status">
                    <span className={`badge badge-${(p.status || 'active').toLowerCase()}`}>
                      {p.status}
                    </span>
                  </div>
                </div>

                <div className="property-card-body">
                  <div className="property-card-title">{p.name}</div>
                  <div className="property-card-addr">
                    <span className="material-icons icon-14 icon-middle">location_on</span>{' '}
                    {p.address}, {p.city}, {p.state}
                  </div>

                  <div className="property-meta">
                    <div className="property-meta-item">
                      <span className="material-icons icon-14 icon-middle">home</span>{' '}
                      <span>{p.type}</span>
                    </div>
                    <div className="property-meta-item">
                      <span className="material-icons icon-14 icon-middle">bed</span>{' '}
                      <span>{p.totalRooms} rooms</span>
                    </div>
                    <div className="property-meta-item">
                      <span className="material-icons icon-14 icon-middle">payments</span>{' '}
                      <span>{formatCurrency(p.monthlyRent)}/mo</span>
                    </div>
                  </div>

                  <div className="occupancy-bar-wrap">
                    <div className="occupancy-bar-label">
                      <span>Occupancy</span>
                      <span>{p.occupiedRooms}/{p.totalRooms} ({pct}%)</span>
                    </div>
                    <div className="occupancy-bar">
                      <div className={`occupancy-fill ${cls} pct-${pct}`}></div>
                    </div>
                  </div>

                  <div className="property-amenities">
                    {amenitiesShown.map((a, i) => (
                      <span key={i} className="amenity-tag">
                        {a}
                      </span>
                    ))}
                    {extraAmenities > 0 && (
                      <span className="amenity-tag">+{extraAmenities} more</span>
                    )}
                  </div>

                  <div className="property-card-actions">
                    <button
                      className="btn btn-secondary btn-sm flex-1"
                      onClick={() => setViewingProperty(p)}
                    >
                      <span className="material-icons icon-16 icon-middle">visibility</span>{' '}
                      View
                    </button>
                    <button
                      className="btn btn-secondary btn-sm flex-1"
                      onClick={() => {
                        setEditingProperty(Object.assign({}, p));
                        setEditError('');
                      }}
                    >
                      <span className="material-icons icon-16 icon-middle">edit</span>{' '}
                      Edit
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setDeletingProperty(p)}
                    >
                      <span className="material-icons icon-16 icon-middle">delete</span>
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
          className="modal-overlay"
          onClick={(e) => {
            if (e.target.className === 'modal-overlay') setViewingProperty(null);
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">
                <span className="material-icons icon-22 icon-middle icon-mr-6">
                  apartment
                </span>{' '}
                {viewingProperty.name}
              </span>
              <button
                className="modal-close"
                onClick={() => setViewingProperty(null)}
              >
                ×
              </button>
            </div>

            <div className="flex-col-gap-12">
              <div className="grid-2-details">
                <div>
                  <div className="text-xs text-muted">Address</div>
                  <div className="font-bold text-sm">
                    {viewingProperty.address}, {viewingProperty.city}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted">State / PIN</div>
                  <div className="font-bold text-sm">
                    {viewingProperty.state} — {viewingProperty.pincode}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted">Type</div>
                  <div className="font-bold text-sm">{viewingProperty.type}</div>
                </div>
                <div>
                  <div className="text-xs text-muted">Status</div>
                  <span className={`badge badge-${(viewingProperty.status || 'active').toLowerCase()}`}>
                    {viewingProperty.status}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-muted">Total Rooms</div>
                  <div className="font-bold text-sm">{viewingProperty.totalRooms}</div>
                </div>
                <div>
                  <div className="text-xs text-muted">Occupied</div>
                  <div className="font-bold text-sm">
                    {viewingProperty.occupiedRooms} ({getOccupancyPercent(viewingProperty.occupiedRooms, viewingProperty.totalRooms)}%)
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted">Monthly Rent</div>
                  <div className="font-bold text-sm text-primary-cost">
                    {formatCurrency(viewingProperty.monthlyRent)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted">Added</div>
                  <div className="font-bold text-sm">
                    {formatDate(viewingProperty.addedDate)}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs text-muted mb-8">Amenities</div>
                <div className="property-amenities">
                  {(viewingProperty.amenities || []).map((a, i) => (
                    <span key={i} className="amenity-tag">
                      {a}
                    </span>
                  ))}
                </div>
              </div>

              <div className="occupancy-bar-wrap">
                <div className="occupancy-bar-label">
                  <span>Occupancy</span>
                  <span>
                    {getOccupancyPercent(viewingProperty.occupiedRooms, viewingProperty.totalRooms)}%
                  </span>
                </div>
                <div className="occupancy-bar">
                  <div
                    className={`occupancy-fill ${getOccupancyClass(getOccupancyPercent(viewingProperty.occupiedRooms, viewingProperty.totalRooms))}`}
                  ></div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setViewingProperty(null)}
              >
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEditingProperty(Object.assign({}, viewingProperty));
                  setViewingProperty(null);
                }}
              >
                <span className="material-icons icon-16 icon-middle">edit</span>{' '}
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Property */}
      {editingProperty && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target.className === 'modal-overlay') setEditingProperty(null);
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">
                <span className="material-icons icon-22 icon-middle icon-mr-6">
                  edit
                </span>{' '}
                Edit Property
              </span>
              <button
                className="modal-close"
                onClick={() => setEditingProperty(null)}
              >
                ×
              </button>
            </div>

            {editError && (
              <div className="alert-danger-sm">{editError}</div>
            )}

            <form onSubmit={handleSaveEdit}>
              <div className="modal-form-scroll">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Property Name</label>
                    <input
                      className="form-input"
                      value={editingProperty.name}
                      onChange={(e) => {
                        const update = { name: e.target.value };
                        setEditingProperty((prev) => Object.assign({}, prev, update));
                      }}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select
                      className="form-input"
                      value={editingProperty.type}
                      onChange={(e) => {
                        const update = { type: e.target.value };
                        setEditingProperty((prev) => Object.assign({}, prev, update));
                      }}
                    >
                      <option value="Mixed">Mixed</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input
                      className="form-input"
                      value={editingProperty.city}
                      onChange={(e) => {
                        const update = { city: e.target.value };
                        setEditingProperty((prev) => Object.assign({}, prev, update));
                      }}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Monthly Rent (₹)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingProperty.monthlyRent}
                      onChange={(e) => {
                        const update = { monthlyRent: Number(e.target.value) };
                        setEditingProperty((prev) => Object.assign({}, prev, update));
                      }}
                      min="0"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Total Rooms</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingProperty.totalRooms}
                      onChange={(e) => {
                        const update = { totalRooms: Number(e.target.value) };
                        setEditingProperty((prev) => Object.assign({}, prev, update));
                      }}
                      min="1"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Occupied Rooms</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingProperty.occupiedRooms}
                      onChange={(e) => {
                        const update = { occupiedRooms: Number(e.target.value) };
                        setEditingProperty((prev) => Object.assign({}, prev, update));
                      }}
                      min="0"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-input"
                      value={editingProperty.status}
                      onChange={(e) => {
                        const update = { status: e.target.value };
                        setEditingProperty((prev) => Object.assign({}, prev, update));
                      }}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="form-label mb-8">Amenities</div>
                  <div className="amenities-grid">
                    {AMENITY_OPTIONS.map((a) => {
                      const isSelected = (editingProperty.amenities || []).includes(a);
                      return (
                        <div
                          key={a}
                          className={`amenity-toggle ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleToggleAmenity(a)}
                        >
                          {a}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingProperty(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <span className="material-icons icon-16 icon-middle">save</span>{' '}
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
          className="modal-overlay"
          onClick={(e) => {
            if (e.target.className === 'modal-overlay') setDeletingProperty(null);
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Delete Property</span>
              <button
                className="modal-close"
                onClick={() => setDeletingProperty(null)}
              >
                ×
              </button>
            </div>
            <p className="modal-desc-text">
              Are you sure you want to delete "<strong>{deletingProperty.name}</strong>"? This action cannot be undone.
            </p>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setDeletingProperty(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
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
