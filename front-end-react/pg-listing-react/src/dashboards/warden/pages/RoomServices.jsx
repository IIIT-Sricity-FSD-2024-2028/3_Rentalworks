import React from 'react';
import useScreenState from '../../../app/useScreenState';
import { useWardenData, useWardenRun, useWardenToast } from '../utils/dataStore';
import { createRoom, deleteRoom, updateRoom, recountBeds } from '../../../features/warden/wardenSlices';
import Modal from '../components/Modal';
import ServiceRequests from '../components/ServiceRequests';

export default function RoomServices() {
  const { data, loading } = useWardenData();
  const run = useWardenRun();
  const [filter, setFilter] = useScreenState('all');

  const [activeModal, setActiveModal] = useScreenState(null); // 'add', 'updateStatus'
  const [selectedRoomId, setSelectedRoom] = useScreenState(null);
  const [formData, setFormData] = useScreenState({});
  const [submitting, setSubmitting] = useScreenState(false);

  const rooms = data.rooms || [];
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId);
  // Properties this warden's rooms belong to (id → name).
  const properties = [...new Map(rooms.filter((r) => r.propertyId).map((r) => [r.propertyId, r.property || `Property ${r.propertyId}`]))];

  const showToast = useWardenToast();

  const filteredRooms = filter === 'all'
    ? rooms
    : rooms.filter(r => {
        const m = (r.maintenanceStatus || r.maintenance || '').toLowerCase().replace(' ', '_');
        const occ = (r.occupancy || '').toLowerCase();
        return m === filter || occ.includes(filter);
      });

  const total = rooms.length;
  const ready = rooms.filter(r => (r.maintenanceStatus || r.maintenance) === 'Ready').length;
  const maintenance = rooms.filter(r => (r.maintenanceStatus || r.maintenance) === 'Under Maintenance').length;
  const cleaned = rooms.filter(r => (r.maintenanceStatus || r.maintenance) === 'Cleaned').length;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const openAddRoomModal = () => {
    setFormData({ type: 'Single', rent: '8000', propertyId: String(properties[0]?.[0] || '') });
    setActiveModal('add');
  };

  const handleAddRoom = async () => {
    const number = (formData.number || '').trim();
    if (!number) {
      showToast('error', 'Error', 'Room number is required');
      return;
    }
    
    const propertyId = Number(formData.propertyId);
    if (!propertyId) {
      showToast('error', 'Error', 'Select a property');
      return;
    }
    if (rooms.some(r => Number(r.propertyId) === propertyId && r.roomNumber === number)) {
      showToast('error', 'Error', 'This room already exists in the selected property');
      return;
    }

    const capacity = formData.type === 'Single' ? 1 : (formData.type === 'Double' ? 2 : 3);
    const rent = Number(formData.rent);
    if (!(rent > 0)) {
      showToast('error', 'Error', 'Enter a valid monthly rent');
      return;
    }

    setSubmitting(true);
    try {
      await run(createRoom({
        roomNumber: number,
        propertyId,
        capacity,
        currentOccupancy: 0,
        rent,
        status: 'available',
        maintenanceStatus: 'Ready',
      }));
      setActiveModal(null);
      showToast('success', `Room ${number} added`);
    } catch (err) {
      showToast('error', 'Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openUpdateStatusModal = (room) => {
    setSelectedRoom(room.id);
    setFormData({ maintenance: room.maintenance || 'Ready', rent: String(room.rent || '') });
    setActiveModal('updateStatus');
  };

  // Occupancy follows tenant stays (check-in / eviction), so only the
  // maintenance state and rent are edited here.
  const handleUpdateStatus = async () => {
    if (!selectedRoom) return;
    const rent = Number(formData.rent);
    if (!(rent > 0)) {
      showToast('error', 'Error', 'Enter a valid monthly rent');
      return;
    }
    const full = selectedRoom.currentOccupancy >= selectedRoom.capacity;
    setSubmitting(true);
    try {
      await run(
        updateRoom({
          id: selectedRoom.id,
          changes: {
            rent,
            maintenanceStatus: formData.maintenance,
            status: formData.maintenance === 'Under Maintenance' ? 'maintenance' : full ? 'full' : 'available',
          },
        }),
      );
      setActiveModal(null);
      showToast('success', `Room ${selectedRoom.number} updated`);
    } catch (err) {
      showToast('error', 'Update Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRoom = async (room) => {
    if (room.currentOccupancy > 0) {
      showToast('error', 'Cannot delete', 'This room still has residents');
      return;
    }
    if (!window.confirm(`Delete room ${room.number}?`)) return;
    try {
      await run(deleteRoom(room.id));
      showToast('success', `Room ${room.number} deleted`);
    } catch (err) {
      showToast('error', 'Delete failed', err.message);
    }
  };

  const getMaintenanceBadge = (status) => {
    if (status === 'Ready') return 'badge-ready';
    if (status === 'Under Maintenance') return 'badge-maintenance';
    if (status === 'Cleaned') return 'badge-cleaned';
    return '';
  };

  return (
    <section id="rooms-section" className="section active">
      <div className="section-header">
        <h2>Room Service Status</h2>
        <p>Manage room maintenance and service status</p>
      </div>

      <div className="room-stats">
        <div className="stat-card">
          <div className="stat-icon blue"><span className="material-icons-outlined" style={{ fontSize: '32px' }}>bed</span></div>
          <div className="stat-label">Total Rooms</div>
          <div className="stat-value">{total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><span className="material-icons-outlined" style={{ fontSize: '32px' }}>check_circle</span></div>
          <div className="stat-label">Ready for Occupancy</div>
          <div className="stat-value">{ready}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><span className="material-icons-outlined" style={{ fontSize: '32px' }}>build</span></div>
          <div className="stat-label">Under Maintenance</div>
          <div className="stat-value">{maintenance}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><span className="material-icons-outlined" style={{ fontSize: '32px' }}>flare</span></div>
          <div className="stat-label">Cleaned</div>
          <div className="stat-value">{cleaned}</div>
        </div>
      </div>

      <div className="filter-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <label>Filter by Status:</label>
          <select className="filter-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="vacant">Vacant</option>
            <option value="occupied">Occupied</option>
            <option value="ready">Ready</option>
            <option value="under_maintenance">Under Maintenance</option>
            <option value="cleaned">Cleaned</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn-login"
            style={{ width: 'auto', padding: '6px 16px', margin: 0, background: 'var(--bg-card, #fff)', color: 'var(--primary)', border: '1px solid var(--primary)' }}
            title="Set every room's occupied beds to the tenants actually staying"
            onClick={async () => {
              try {
                const r = await run(recountBeds());
                showToast('success', r.changed ? `Bed counts fixed in ${r.changed} room${r.changed > 1 ? 's' : ''}` : 'All bed counts are already correct');
              } catch (err) {
                showToast('error', 'Recount failed', err.message);
              }
            }}
          >
            ↻ Recount beds
          </button>
          <button
            className="btn-login"
            style={{ width: 'auto', padding: '6px 16px', margin: 0, background: 'var(--primary)' }}
            onClick={openAddRoomModal}
          >
            + Add Room
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Room Number</th>
              <th>Room Type</th>
              <th>Occupancy Status</th>
              <th>Maintenance Status</th>
              <th>Rent</th>
              <th>Last Updated</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRooms.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', color: '#6b7280', padding: '24px' }}>
                {loading ? 'Loading rooms...' : 'No rooms found for selected filter'}
              </td></tr>
            ) : (
              filteredRooms.map(r => (
                <tr key={r.id}>
                  <td>🏠 {r.number}</td>
                  <td><span style={{ background: '#f3f4f6', padding: '3px 10px', borderRadius: '20px', fontSize: '12px' }}>{r.type}</span></td>
                  <td>
                    <span className={`badge badge-${r.occupancy && r.occupancy.includes('Occupied') ? 'occupied' : 'vacant'}`}>
                      {r.occupancy}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${getMaintenanceBadge(r.maintenanceStatus || r.maintenance)}`}>
                      {r.maintenanceStatus || r.maintenance}
                    </span>
                  </td>
                  <td>₹{r.rent?.toLocaleString()}</td>
                  <td>{r.lastUpdated}</td>
                  <td>
                    <button className="btn-update-status" onClick={() => openUpdateStatusModal(r)}>
                      Update Status
                    </button>
                    {r.currentOccupancy === 0 && (
                      <button className="icon-btn" onClick={() => handleDeleteRoom(r)} title="Delete room">🗑️</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ServiceRequests />

      {/* Add Room Modal */}
      <Modal 
        isOpen={activeModal === 'add'} 
        title="Add New Room"
        onCancel={() => setActiveModal(null)}
        onConfirm={handleAddRoom}
        confirmText={submitting ? 'Saving...' : 'Add Room'}
      >
        <div className="form-group">
          <label>Property</label>
          <select
            className="filter-select"
            style={{ width: '100%', boxSizing: 'border-box' }}
            value={formData.propertyId || ''}
            onChange={(e) => handleInputChange('propertyId', e.target.value)}
          >
            <option value="">Select property</option>
            {properties.map(([pid, name]) => (
              <option key={pid} value={pid}>{name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Room Number</label>
          <input 
            type="text" 
            className="filter-select" 
            style={{ width: '100%', boxSizing: 'border-box' }} 
            placeholder="e.g. 203 or A-204"
            value={formData.number || ''}
            onChange={(e) => handleInputChange('number', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Room Type</label>
          <select 
            className="filter-select" 
            style={{ width: '100%', boxSizing: 'border-box' }}
            value={formData.type || 'Single'}
            onChange={(e) => handleInputChange('type', e.target.value)}
          >
            <option value="Single">Single (Capacity 1)</option>
            <option value="Double">Double (Capacity 2)</option>
            <option value="Triple">Triple (Capacity 3)</option>
          </select>
        </div>
        <div className="form-group">
          <label>Monthly Rent (₹)</label>
          <input 
            type="number" 
            className="filter-select" 
            style={{ width: '100%', boxSizing: 'border-box' }} 
            placeholder="e.g. 8000"
            value={formData.rent || ''}
            onChange={(e) => handleInputChange('rent', e.target.value)}
          />
        </div>
      </Modal>

      {/* Update Status Modal */}
      <Modal 
        isOpen={activeModal === 'updateStatus'} 
        title={`Update Room ${selectedRoom?.number || ''} Status`}
        onCancel={() => setActiveModal(null)}
        onConfirm={handleUpdateStatus}
        confirmText={submitting ? 'Saving...' : 'Update Status'}
      >
        <div className="form-group">
          <label>Occupancy</label>
          <input
            type="text"
            className="filter-select"
            style={{ width: '100%', boxSizing: 'border-box' }}
            value={`${selectedRoom?.currentOccupancy ?? 0} of ${selectedRoom?.capacity ?? 0} beds taken`}
            readOnly
          />
        </div>
        <div className="form-group">
          <label>Monthly Rent (₹)</label>
          <input
            type="number"
            className="filter-select"
            style={{ width: '100%', boxSizing: 'border-box' }}
            value={formData.rent || ''}
            onChange={(e) => handleInputChange('rent', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Maintenance Status</label>
          <select 
            className="filter-select" 
            style={{ width: '100%', boxSizing: 'border-box' }}
            value={formData.maintenance || 'Ready'}
            onChange={(e) => handleInputChange('maintenance', e.target.value)}
          >
            <option value="Ready">Ready</option>
            <option value="Under Maintenance">Under Maintenance</option>
            <option value="Cleaned">Cleaned</option>
          </select>
        </div>
      </Modal>

    </section>
  );
}
