import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const AMENITY_LIST = [
  { label: 'WiFi', icon: 'wifi' },
  { label: 'AC', icon: 'ac_unit' },
  { label: 'Laundry', icon: 'local_laundry_service' },
  { label: 'Parking', icon: 'local_parking' },
  { label: 'Gym', icon: 'fitness_center' },
  { label: 'Mess', icon: 'restaurant' },
  { label: 'Power Backup', icon: 'power' },
  { label: 'Security', icon: 'lock' },
];

// AddProperty: Controlled form with validation to add a new property
export default function AddProperty({ onAddProperty }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    type: '',
    capacity: '',
    rooms: '',
    rent: '',
    occupied: 0,
    status: 'Active',
    description: '',
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
      errUpdate[id] = '';
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
    if (!formData.name.trim()) newErrors.name = 'Property name is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';

    if (!/^\d{6}$/.test(formData.pincode.trim())) {
      newErrors.pincode = 'Valid 6-digit pincode required';
    }

    if (!formData.type) newErrors.type = 'Please select a type';
    if (!formData.capacity || Number(formData.capacity) < 1) {
      newErrors.capacity = 'Capacity is required';
    }
    if (!formData.rooms || Number(formData.rooms) < 1) {
      newErrors.rooms = 'Total rooms is required';
    }
    if (!formData.rent || Number(formData.rent) < 0) {
      newErrors.rent = 'Rent is required';
    }
    if (Number(formData.occupied) > Number(formData.rooms)) {
      newErrors.occupied = 'Occupied rooms cannot exceed total rooms';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 300));

    const newProperty = {
      id: 'prop_' + Date.now(),
      name: formData.name.trim(),
      address: formData.address.trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      pincode: formData.pincode.trim(),
      type: formData.type,
      totalCapacity: Number(formData.capacity),
      totalRooms: Number(formData.rooms),
      occupiedRooms: Number(formData.occupied) || 0,
      monthlyRent: Number(formData.rent),
      amenities: selectedAmenities,
      status: formData.status,
      addedDate: new Date().toISOString().split('T')[0],
      description: formData.description.trim(),
      owner: 'Rajesh Kumar',
      ownerEmail: 'rajesh.k@email.com',
    };

    onAddProperty(newProperty);
    setIsSubmitting(false);
    navigate('/properties');
  };

  return (
    <div>
      <div className="page-header">
        <Link to="/properties" className="back-link">
          ← Back to Properties
        </Link>
        <h1>Add New Property</h1>
        <p>Submit property details for system verification</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Section 01: Basic Information */}
        <div className="form-section">
          <div className="form-section-header">
            <div className="num-badge">01</div>
            <div className="form-section-title">Basic Information</div>
          </div>

          <div className="form-grid">
            <div className={errors.name ? 'form-group has-error' : 'form-group'}>
              <label className="form-label">
                Property Name <span className="req">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                id="name"
                placeholder="e.g. Sunrise PG"
                value={formData.name}
                onChange={handleChange}
              />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>

            <div className={errors.address ? 'form-group has-error' : 'form-group'}>
              <label className="form-label">
                Address <span className="req">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                id="address"
                placeholder="Street address"
                value={formData.address}
                onChange={handleChange}
              />
              {errors.address && <span className="form-error">{errors.address}</span>}
            </div>

            <div className={errors.city ? 'form-group has-error' : 'form-group'}>
              <label className="form-label">
                City <span className="req">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                id="city"
                placeholder="Chennai"
                value={formData.city}
                onChange={handleChange}
              />
              {errors.city && <span className="form-error">{errors.city}</span>}
            </div>

            <div className={errors.state ? 'form-group has-error' : 'form-group'}>
              <label className="form-label">
                State <span className="req">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                id="state"
                placeholder="Tamil Nadu"
                value={formData.state}
                onChange={handleChange}
              />
              {errors.state && <span className="form-error">{errors.state}</span>}
            </div>

            <div className={errors.pincode ? 'form-group has-error' : 'form-group'}>
              <label className="form-label">
                Pincode <span className="req">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                id="pincode"
                placeholder="600001"
                maxLength="6"
                value={formData.pincode}
                onChange={handleChange}
              />
              {errors.pincode && <span className="form-error">{errors.pincode}</span>}
            </div>

            <div className={errors.type ? 'form-group has-error' : 'form-group'}>
              <label className="form-label">
                Property Type <span className="req">*</span>
              </label>
              <select
                className="form-input"
                id="type"
                value={formData.type}
                onChange={handleChange}
              >
                <option value="">Select type</option>
                <option value="Mixed">Mixed (Male &amp; Female)</option>
                <option value="Male">Male Only</option>
                <option value="Female">Female Only</option>
              </select>
              {errors.type && <span className="form-error">{errors.type}</span>}
            </div>
          </div>
        </div>

        {/* Section 02: Details */}
        <div className="form-section">
          <div className="form-section-header">
            <div className="num-badge">02</div>
            <div className="form-section-title">Property Details</div>
          </div>

          <div className="form-grid-3">
            <div className={errors.capacity ? 'form-group has-error' : 'form-group'}>
              <label className="form-label">
                Total Capacity <span className="req">*</span>
              </label>
              <input
                type="number"
                className="form-input"
                id="capacity"
                placeholder="20"
                min="1"
                value={formData.capacity}
                onChange={handleChange}
              />
              {errors.capacity && <span className="form-error">{errors.capacity}</span>}
            </div>

            <div className={errors.rooms ? 'form-group has-error' : 'form-group'}>
              <label className="form-label">
                Total Rooms <span className="req">*</span>
              </label>
              <input
                type="number"
                className="form-input"
                id="rooms"
                placeholder="10"
                min="1"
                value={formData.rooms}
                onChange={handleChange}
              />
              {errors.rooms && <span className="form-error">{errors.rooms}</span>}
            </div>

            <div className={errors.rent ? 'form-group has-error' : 'form-group'}>
              <label className="form-label">
                Monthly Rent (₹) <span className="req">*</span>
              </label>
              <input
                type="number"
                className="form-input"
                id="rent"
                placeholder="8000"
                min="0"
                value={formData.rent}
                onChange={handleChange}
              />
              {errors.rent && <span className="form-error">{errors.rent}</span>}
            </div>

            <div className={errors.occupied ? 'form-group has-error' : 'form-group'}>
              <label className="form-label">Currently Occupied</label>
              <input
                type="number"
                className="form-input"
                id="occupied"
                placeholder="0"
                min="0"
                value={formData.occupied}
                onChange={handleChange}
              />
              {errors.occupied && <span className="form-error">{errors.occupied}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-input"
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
        <div className="form-section">
          <div className="form-section-header">
            <div className="num-badge">03</div>
            <div className="form-section-title">Amenities</div>
          </div>

          <div className="amenities-grid" id="amenitiesGrid">
            {AMENITY_LIST.map((a) => {
              const isSelected = selectedAmenities.includes(a.label);
              return (
                <div
                  key={a.label}
                  className={`amenity-toggle ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleAmenity(a.label)}
                >
                  <span className="material-icons icon-16">{a.icon}</span>{' '}
                  {a.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 04: Description */}
        <div className="form-section">
          <div className="form-section-header">
            <div className="num-badge">04</div>
            <div className="form-section-title">
              Additional Notes <span className="prop-sub-row">(Optional)</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Property Description</label>
            <textarea
              className="form-input"
              id="description"
              placeholder="Enter any additional details about the property, rules, nearby landmarks"
              rows="4"
              value={formData.description}
              onChange={handleChange}
            ></textarea>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex-end-gap mt-8">
          <Link to="/properties" className="btn btn-secondary btn-lg">
            Cancel
          </Link>
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            id="submitBtn"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              'Submitting...'
            ) : (
              <>
                <span className="material-icons icon-18 icon-middle">check</span>{' '}
                Submit for Verification
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
