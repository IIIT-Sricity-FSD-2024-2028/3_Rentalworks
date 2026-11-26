import Icon from '../components/Icon';
import FileDropZone from '../components/FileDropZone';
import AmenityPicker from '../components/AmenityPicker';
import PhotoUploader from '../components/PhotoUploader';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { REQUIRED_DOCUMENTS, OPTIONAL_DOCUMENTS, DOCUMENT_ACCEPT, DOCUMENT_MAX_MB, documentFileError } from '../../../features/repositories/propertyDocumentsSlice';
import { SHARING_TYPES } from '../../../features/repositories/propertiesSlice';

const TEXT_FIELDS = [
  { id: 'name', label: 'Property Name', placeholder: 'e.g. Sunrise PG' },
  { id: 'address', label: 'Address', placeholder: 'Street address' },
  { id: 'city', label: 'City', placeholder: 'Chennai' },
  { id: 'state', label: 'State', placeholder: 'Tamil Nadu' },
  { id: 'pincode', label: 'Pincode', placeholder: '600001', inputMode: 'numeric', maxLength: 6 },
];

// Who may book is decided by the property type (Male → boys only,
// Female → girls only, Mixed → everyone); the server enforces it at checkout.
const TYPES = [
  { value: 'Mixed', label: 'Mixed (Male & Female)' },
  { value: 'Male', label: 'Male only (boys PG)' },
  { value: 'Female', label: 'Female only (girls PG)' },
];

// AddProperty: listing details, rent per room size, amenities (incl. custom),
// photos (at least one) and verification documents.
export default function AddProperty({ onSubmitProperty }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ name: '', address: '', city: '', state: '', pincode: '', type: '', capacity: '', rooms: '', description: '' });
  const [rents, setRents] = useState({ single: '', double: '', triple: '' });
  const [amenities, setAmenities] = useState([]);
  const [photos, setPhotos] = useState([]);
  // Verification documents, kept as File objects until the property is created.
  const [documents, setDocuments] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearError = (key) => errors[key] && setErrors((prev) => ({ ...prev, [key]: '' }));
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    clearError(id);
  };

  // The same file uploaded as two different documents is almost always a mistake.
  const sameFile = (a, b) => a && b && a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;
  const duplicateError = (type, file, docs = documents) => {
    const other = Object.entries(docs).find(([t, f]) => t !== type && sameFile(f, file));
    if (!other) return '';
    const name = [...REQUIRED_DOCUMENTS, ...OPTIONAL_DOCUMENTS].find((d) => d.type === other[0])?.label || other[0];
    return `This is the same file you chose for ${name}. Choose the correct document`;
  };

  const validate = () => {
    const e = {};
    if (!formData.name.trim()) e.name = 'Property name is required';
    if (!formData.address.trim()) e.address = 'Address is required';
    if (!formData.city.trim()) e.city = 'City is required';
    if (!formData.state.trim()) e.state = 'State is required';
    if (!/^\d{6}$/.test(formData.pincode.trim())) e.pincode = 'Valid 6-digit pincode required';
    if (!formData.type) e.type = 'Choose who the PG is for';
    if (!(Number(formData.capacity) >= 1)) e.capacity = 'Total beds is required';
    if (!(Number(formData.rooms) >= 1)) e.rooms = 'Total rooms is required';
    if (Number(formData.rooms) > Number(formData.capacity)) e.rooms = 'Rooms cannot be more than total beds';

    const offered = SHARING_TYPES.filter(({ key }) => String(rents[key]).trim() !== '');
    SHARING_TYPES.forEach(({ key, short }) => {
      const v = String(rents[key]).trim();
      if (v !== '' && !(Number(v) > 0)) e[`rent_${key}`] = `Enter a valid ${short.toLowerCase()} rent`;
    });
    if (!offered.length) e.rents = 'Enter the rent for at least one room size';

    if (!photos.length) e.photos = 'Add at least one photo of the property';

    REQUIRED_DOCUMENTS.forEach(({ type, label }) => {
      const err = documents[type] ? documentFileError(documents[type]) || duplicateError(type, documents[type]) : `${label} is required`;
      if (err) e[`doc_${type}`] = err;
    });
    OPTIONAL_DOCUMENTS.forEach(({ type }) => {
      const err = documents[type] ? documentFileError(documents[type]) || duplicateError(type, documents[type]) : '';
      if (err) e[`doc_${type}`] = err;
    });

    setErrors(e);
    const first = Object.keys(e).find((k) => e[k]);
    if (first) document.getElementById(first.startsWith('doc_') ? first : first.startsWith('rent') ? 'rent_single' : first === 'photos' ? 'propertyPhotos-zone' : first)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return !first;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate() || isSubmitting) return;
    setIsSubmitting(true);
    const property = {
      name: formData.name.trim(),
      address: formData.address.trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      pincode: formData.pincode.trim(),
      type: formData.type,
      totalCapacity: Number(formData.capacity),
      totalRooms: Number(formData.rooms),
      occupiedRooms: 0,
      sharingRents: rents,
      amenities,
      images: [],
      description: formData.description.trim(),
    };
    const result = await onSubmitProperty({ property, documents, photos });
    setIsSubmitting(false);
    if (result) navigate('/dashboard/owner/properties');
  };

  const field = (f) => (
    <div key={f.id} className={errors[f.id] ? 'form-group has-error' : 'form-group'}>
      <label className="form-label" htmlFor={f.id}>
        {f.label} <span className="req">*</span>
      </label>
      <input type="text" className="form-input" id={f.id} placeholder={f.placeholder} inputMode={f.inputMode} maxLength={f.maxLength} value={formData[f.id]} onChange={handleChange} />
      {errors[f.id] && <span className="form-error">{errors[f.id]}</span>}
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <Link to="/dashboard/owner/properties" className="back-link">
          ← Back to Properties
        </Link>
        <h1>Add New Property</h1>
        <p>Submit property details for system verification</p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* Section 01: Basic Information */}
        <div className="form-section">
          <div className="form-section-header">
            <div className="num-badge">01</div>
            <div className="form-section-title">Basic Information</div>
          </div>
          <div className="form-grid">
            {TEXT_FIELDS.map(field)}
            <div className={errors.type ? 'form-group has-error' : 'form-group'}>
              <label className="form-label" htmlFor="type">
                Property Type <span className="req">*</span>
              </label>
              <select className="form-input" id="type" value={formData.type} onChange={handleChange} aria-describedby="type-hint">
                <option value="">Select type</option>
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <span id="type-hint" className="prop-sub-row">
                Decides who can book: boys only, girls only, or everyone.
              </span>
              {errors.type && <span className="form-error">{errors.type}</span>}
            </div>
          </div>
        </div>

        {/* Section 02: Rooms and rent */}
        <div className="form-section">
          <div className="form-section-header">
            <div className="num-badge">02</div>
            <div className="form-section-title">Rooms &amp; Rent</div>
          </div>
          <div className="form-grid">
            <div className={errors.capacity ? 'form-group has-error' : 'form-group'}>
              <label className="form-label" htmlFor="capacity">
                Total Beds <span className="req">*</span>
              </label>
              <input type="number" className="form-input" id="capacity" placeholder="20" min="1" value={formData.capacity} onChange={handleChange} />
              {errors.capacity && <span className="form-error">{errors.capacity}</span>}
            </div>
            <div className={errors.rooms ? 'form-group has-error' : 'form-group'}>
              <label className="form-label" htmlFor="rooms">
                Total Rooms <span className="req">*</span>
              </label>
              <input type="number" className="form-input" id="rooms" placeholder="10" min="1" value={formData.rooms} onChange={handleChange} />
              {errors.rooms && <span className="form-error">{errors.rooms}</span>}
            </div>
          </div>

          <fieldset style={{ border: 0, padding: 0, margin: '8px 0 0' }}>
            <legend className="form-label" style={{ marginBottom: 4 }}>
              Monthly rent per bed, by room size <span className="req">*</span>
            </legend>
            <p className="prop-sub-row" style={{ marginTop: 0 }}>
              Fill only the room sizes you offer. You can set each room's exact rent later on the Rooms page.
            </p>
            <div className="form-grid-3">
              {SHARING_TYPES.map(({ key, label }) => (
                <div key={key} className={errors[`rent_${key}`] ? 'form-group has-error' : 'form-group'}>
                  <label className="form-label" htmlFor={`rent_${key}`}>
                    {label} (₹)
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    id={`rent_${key}`}
                    min="1"
                    placeholder="Not offered"
                    value={rents[key]}
                    onChange={(e) => {
                      setRents((prev) => ({ ...prev, [key]: e.target.value }));
                      clearError(`rent_${key}`);
                      clearError('rents');
                    }}
                  />
                  {errors[`rent_${key}`] && <span className="form-error">{errors[`rent_${key}`]}</span>}
                </div>
              ))}
            </div>
            {errors.rents && (
              <span className="form-error" role="alert">
                {errors.rents}
              </span>
            )}
          </fieldset>
        </div>

        {/* Section 03: Amenities */}
        <div className="form-section">
          <div className="form-section-header">
            <div className="num-badge">03</div>
            <div className="form-section-title">Amenities</div>
          </div>
          <AmenityPicker value={amenities} onChange={setAmenities} />
        </div>

        {/* Section 04: Photos (required) */}
        <div className="form-section">
          <div className="form-section-header">
            <div className="num-badge">04</div>
            <div className="form-section-title">
              Property Photos <span className="req">*</span>
            </div>
          </div>
          <p className="prop-sub-row" style={{ marginTop: 0 }}>
            At least one photo. The first one is the cover tenants see on the listing.
          </p>
          <div id="propertyPhotos-zone">
            <PhotoUploader
              files={photos}
              error={errors.photos}
              onChange={(next) => {
                setPhotos(next);
                if (next.length) clearError('photos');
              }}
            />
          </div>
        </div>

        {/* Section 05: Description */}
        <div className="form-section">
          <div className="form-section-header">
            <div className="num-badge">05</div>
            <div className="form-section-title">
              Description <span className="prop-sub-row">(Optional)</span>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="description">
              About the property
            </label>
            <textarea
              className="form-input"
              id="description"
              placeholder="Nearby landmarks, transport, what makes your PG special"
              rows="4"
              value={formData.description}
              onChange={handleChange}
            ></textarea>
          </div>
        </div>

        {/* Section 06: Verification Documents */}
        <div className="form-section">
          <div className="form-section-header">
            <div className="num-badge">06</div>
            <div className="form-section-title">
              Verification Documents <span className="prop-sub-row">(an admin reviews these before your PG goes live)</span>
            </div>
          </div>
          <p className="text-muted" style={{ marginTop: 0 }}>
            PDF, JPG, PNG or WEBP, up to {DOCUMENT_MAX_MB} MB each. Only you and RentBro admins can open these files.
          </p>
          <div className="form-grid">
            {[...REQUIRED_DOCUMENTS.map((d) => ({ ...d, required: true })), ...OPTIONAL_DOCUMENTS].map(({ type, label, hint, required }) => (
              <div className="form-group" key={type}>
                <label className="form-label" htmlFor={`doc_${type}`}>
                  {label} {required ? <span className="req">*</span> : <span className="prop-sub-row">(optional)</span>}
                </label>
                <FileDropZone
                  id={`doc_${type}`}
                  accept={DOCUMENT_ACCEPT}
                  file={documents[type]}
                  hint={hint}
                  error={errors[`doc_${type}`]}
                  onFile={(file) => {
                    setDocuments((prev) => ({ ...prev, [type]: file }));
                    setErrors((prev) => ({ ...prev, [`doc_${type}`]: documentFileError(file) || duplicateError(type, file) }));
                  }}
                  onClear={() => {
                    setDocuments((prev) => ({ ...prev, [type]: null }));
                    setErrors((prev) => ({ ...prev, [`doc_${type}`]: '' }));
                  }}
                />
                {errors[`doc_${type}`] && (
                  <div className="form-error" role="alert">
                    {errors[`doc_${type}`]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex-end-gap mt-8">
          <Link to="/dashboard/owner/properties" className="btn btn-secondary btn-lg">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary btn-lg" id="submitBtn" disabled={isSubmitting}>
            {isSubmitting ? (
              'Uploading photos and documents…'
            ) : (
              <>
                <Icon className="material-icons icon-18 icon-middle">check</Icon> Submit for Verification
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
