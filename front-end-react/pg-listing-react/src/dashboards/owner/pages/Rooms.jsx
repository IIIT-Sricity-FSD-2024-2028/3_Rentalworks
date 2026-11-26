import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import { formatINR } from '../../../utils/normalize';

const SHARING = [
  { capacity: 1, label: 'Single' },
  { capacity: 2, label: 'Double sharing' },
  { capacity: 3, label: 'Triple sharing' },
  { capacity: 4, label: '4 sharing' },
];
const EMPTY = { id: null, propertyId: '', roomNumber: '', capacity: 2, rent: '', status: 'available' };

const statusBadge = (room) =>
  room.underMaintenance ? ['badge-pending', 'Maintenance'] : room.available ? ['badge-active', `${room.bedsLeft} bed${room.bedsLeft === 1 ? '' : 's'} free`] : ['badge-open', 'Full'];

/**
 * Rooms: owners add the real rooms and beds of each property. These rooms are
 * what tenants book on the public listing, and they drive occupancy and rent.
 * Bed occupancy is set by bookings, never typed in here.
 */
export default function Rooms({ rooms = [], properties = [], onAddRoom, onUpdateRoom, onDeleteRoom }) {
  const [filterProperty, setFilterProperty] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const shown = useMemo(() => rooms.filter((r) => !filterProperty || String(r.propertyId) === filterProperty), [rooms, filterProperty]);
  const totals = useMemo(
    () => ({
      rooms: shown.length,
      beds: shown.reduce((n, r) => n + r.capacity, 0),
      occupied: shown.reduce((n, r) => n + r.currentOccupancy, 0),
    }),
    [shown],
  );

  const openAdd = () => {
    setError('');
    setEditing({ ...EMPTY, propertyId: filterProperty || (properties[0] ? String(properties[0].id) : '') });
  };
  const openEdit = (r) => {
    setError('');
    setEditing({
      id: r.id,
      propertyId: String(r.propertyId),
      roomNumber: r.roomNumber,
      capacity: r.capacity,
      rent: r.rent,
      status: r.underMaintenance ? 'maintenance' : 'available',
      occupied: r.currentOccupancy,
    });
  };

  const save = async (e) => {
    e.preventDefault();
    if (!editing.propertyId) return setError('Choose a property');
    if (!String(editing.roomNumber).trim()) return setError('Enter a room number');
    if (!(Number(editing.rent) > 0)) return setError('Enter the monthly rent per bed');
    if (editing.id && Number(editing.capacity) < (editing.occupied || 0)) {
      return setError(`This room has ${editing.occupied} tenant(s); capacity cannot be lower`);
    }
    const duplicate = rooms.some(
      (r) => r.id !== editing.id && String(r.propertyId) === String(editing.propertyId) && String(r.roomNumber).trim().toLowerCase() === String(editing.roomNumber).trim().toLowerCase(),
    );
    if (duplicate) return setError(`Room ${editing.roomNumber} already exists in this property`);

    setSaving(true);
    const body = {
      id: editing.id,
      propertyId: Number(editing.propertyId),
      roomNumber: String(editing.roomNumber).trim(),
      capacity: Number(editing.capacity),
      rent: Number(editing.rent),
      // A room under maintenance cannot be booked; otherwise bookings decide available / full.
      status: editing.status === 'maintenance' ? 'maintenance' : 'available',
    };
    const ok = editing.id ? await onUpdateRoom(body) : await onAddRoom(body);
    setSaving(false);
    if (ok) setEditing(null);
  };

  const confirmDelete = async () => {
    if (await onDeleteRoom(deleting.id)) setDeleting(null);
  };

  if (!properties.length) {
    return (
      <div className="empty-state empty-state-grid">
        <div className="empty-icon">
          <Icon className="material-icons icon-48 icon-light">meeting_room</Icon>
        </div>
        <h3>No properties yet</h3>
        <p>
          <Link to="/dashboard/owner/add-property" className="text-primary-cost">
            Add a property
          </Link>{' '}
          first, then add its rooms here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex-between mb-20">
        <div className="text-muted">
          {totals.rooms} room{totals.rooms === 1 ? '' : 's'} · {totals.occupied}/{totals.beds} beds occupied
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Icon className="material-icons icon-18">add</Icon> Add Room
        </button>
      </div>

      <div className="card mb-20" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <label htmlFor="roomPropertyFilter" className="form-label" style={{ margin: 0 }}>
          Property
        </label>
        <select id="roomPropertyFilter" className="form-input" style={{ maxWidth: 320 }} value={filterProperty} onChange={(e) => setFilterProperty(e.target.value)}>
          <option value="">All properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <span className="text-muted" style={{ fontSize: 13 }}>
          Rooms you add here are what tenants see and book on your public listing.
        </span>
      </div>

      {shown.length === 0 ? (
        <div className="card empty-state p-30-20">
          <div className="empty-icon">
            <Icon className="material-icons icon-48 icon-light">bed</Icon>
          </div>
          <h3>No rooms listed</h3>
          <p>Add each room with its number of beds and rent so tenants can book it.</p>
          <button className="btn btn-primary" onClick={openAdd} style={{ marginTop: 12 }}>
            Add your first room
          </button>
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Room</th>
                <th>Property</th>
                <th>Type</th>
                <th>Beds occupied</th>
                <th>Rent / bed</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const [cls, text] = statusBadge(r);
                return (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.roomNumber}</strong>
                    </td>
                    <td>{r.propertyName}</td>
                    <td>{r.type}</td>
                    <td>
                      {r.currentOccupancy}/{r.capacity}
                    </td>
                    <td>{formatINR(r.rent)}</td>
                    <td>
                      <span className={`badge ${cls}`}>{text}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(r)}>
                        <Icon className="material-icons icon-16">edit</Icon> Edit
                      </button>{' '}
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setDeleting(r)}
                        disabled={r.currentOccupancy > 0}
                        title={r.currentOccupancy > 0 ? 'Rooms with tenants cannot be deleted' : 'Delete room'}
                      >
                        <Icon className="material-icons icon-16">delete</Icon>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="modal-overlay show active" onClick={(e) => e.target.classList.contains('modal-overlay') && setEditing(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="roomModalTitle">
            <div className="modal-header">
              <span className="modal-title" id="roomModalTitle">
                <Icon className="material-icons icon-22 icon-middle icon-mr-6">meeting_room</Icon> {editing.id ? `Edit room ${editing.roomNumber}` : 'Add room'}
              </span>
              <button className="modal-close" onClick={() => setEditing(null)} aria-label="Close">
                ×
              </button>
            </div>
            <form onSubmit={save}>
              {error && <div className="alert-danger-sm" role="alert">{error}</div>}
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="roomProperty">
                    Property <span className="req">*</span>
                  </label>
                  <select id="roomProperty" className="form-input" value={editing.propertyId} disabled={Boolean(editing.id)} onChange={(e) => setEditing({ ...editing, propertyId: e.target.value })}>
                    <option value="">Select…</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="roomNumber">
                    Room number <span className="req">*</span>
                  </label>
                  <input id="roomNumber" className="form-input" value={editing.roomNumber} onChange={(e) => setEditing({ ...editing, roomNumber: e.target.value })} placeholder="e.g. 101" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="roomCapacity">
                    Beds (sharing) <span className="req">*</span>
                  </label>
                  <select id="roomCapacity" className="form-input" value={editing.capacity} onChange={(e) => setEditing({ ...editing, capacity: Number(e.target.value) })}>
                    {SHARING.map((s) => (
                      <option key={s.capacity} value={s.capacity}>
                        {s.label} ({s.capacity} bed{s.capacity === 1 ? '' : 's'})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="roomRent">
                    Monthly rent per bed (₹) <span className="req">*</span>
                  </label>
                  <input id="roomRent" type="number" min="1" className="form-input" value={editing.rent} onChange={(e) => setEditing({ ...editing, rent: e.target.value })} placeholder="e.g. 8500" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="roomStatus">
                    Availability
                  </label>
                  <select id="roomStatus" className="form-input" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                    <option value="available">Open for booking</option>
                    <option value="maintenance">Under maintenance (not bookable)</option>
                  </select>
                </div>
                {editing.id && (
                  <div className="form-group">
                    <span className="form-label">Beds occupied</span>
                    <p className="text-muted">{editing.occupied} — updated automatically by bookings</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : editing.id ? 'Save changes' : 'Add room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleting && (
        <div className="modal-overlay show active" onClick={(e) => e.target.classList.contains('modal-overlay') && setDeleting(null)}>
          <div className="modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <span className="modal-title">Delete room {deleting.roomNumber}?</span>
              <button className="modal-close" onClick={() => setDeleting(null)} aria-label="Close">
                ×
              </button>
            </div>
            <p>
              Room {deleting.roomNumber} at {deleting.propertyName} will be removed from your listing.
            </p>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleting(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmDelete}>
                Delete room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
