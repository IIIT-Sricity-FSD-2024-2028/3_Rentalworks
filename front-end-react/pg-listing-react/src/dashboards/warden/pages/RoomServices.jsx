import React, { useState } from 'react';
import { useWardenData } from '../utils/dataStore';
import { createRoomApi, updateRoomApi } from '../utils/api';
import Modal from '../components/Modal';

export default function RoomServices() {
  const { data, refreshData, loading } = useWardenData();
  const [filter, setFilter] = useState('all');

  const [activeModal, setActiveModal] = useState(null); // 'add', 'updateStatus'
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [formData, setFormData] = useState({});
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const rooms = data.rooms || [];

  const showToast = (type, title, message) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 3500);
  };

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
    setFormData({ type: 'Single', rent: '8000' });
    setActiveModal('add');
  };

  const handleAddRoom = async () => {
    const number = (formData.number || '').trim();
    if (!number) {
      showToast('error', 'Error', 'Room number is required');
      return;
    }
    
    if (rooms.find(r => r.number === number || r.roomNumber === number)) {
      showToast('error', 'Error', 'Room already exists');
      return;
    }

    const capacity = formData.type === 'Single' ? 1 : (formData.type === 'Double' ? 2 : 3);
    const rent = Number(formData.rent) || (capacity === 1 ? 10000 : (capacity === 2 ? 8000 : 7000));

    setSubmitting(true);
    try {
      await createRoomApi({
        roomNumber: number,
        propertyId: 1,
        capacity,
        currentOccupancy: 0,
        rent,
        status: 'available',
        maintenanceStatus: 'Ready',
      });

      await refreshData();
      setActiveModal(null);
      showToast('success', 'Changes Saved', 'Changes saved');
    } catch (err) {
      showToast('error', 'Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openUpdateStatusModal = (room) => {
    setSelectedRoom(room);
    setFormData({
      occupancy: room.occupancy && room.occupancy.includes('Occupied') ? 'Occupied' : 'Vacant',
      maintenance: room.maintenanceStatus || room.maintenance || 'Ready',
    });
    setActiveModal('updateStatus');
  };

  const handleUpdateStatus = async () => {
    if (!selectedRoom) return;

    setSubmitting(true);
    try {
      const isOccupied = formData.occupancy === 'Occupied';
      await updateRoomApi(selectedRoom.id, {
        status: isOccupied ? 'full' : 'available',
        maintenanceStatus: formData.maintenance,
        currentOccupancy: isOccupied
          ? (selectedRoom.currentOccupancy > 0 ? selectedRoom.currentOccupancy : selectedRoom.capacity)
          : 0,
      });

      await refreshData();
      setActiveModal(null);
      showToast('success', 'Changes Saved', 'Changes saved');
    } catch (err) {
      showToast('error', 'Update Failed', err.message);
    } finally {
      setSubmitting(false);
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
        <button 
          className="btn-login" 
          style={{ width: 'auto', padding: '6px 16px', margin: 0, background: 'var(--primary)' }} 
          onClick={openAddRoomModal}
        >
          + Add Room
        </button>
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Room Modal */}
      <Modal 
        isOpen={activeModal === 'add'} 
        title="Add New Room"
        onCancel={() => setActiveModal(null)}
        onConfirm={handleAddRoom}
        confirmText={submitting ? 'Saving...' : 'Add Room'}
      >
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
          <label>Occupancy Status</label>
          <select 
            className="filter-select" 
            style={{ width: '100%', boxSizing: 'border-box' }}
            value={formData.occupancy || 'Vacant'}
            onChange={(e) => handleInputChange('occupancy', e.target.value)}
          >
            <option value="Vacant">Vacant</option>
            <option value="Occupied">Occupied</option>
          </select>
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

      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type} show`}>
          <span className="toast-icon">
            <span className="material-icons-outlined" style={{ fontSize: '24px' }}>
              {toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'cancel' : 'info'}
            </span>
          </span>
          <div className="toast-text">
            <strong>{toast.title}</strong>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </section>
  );
}
