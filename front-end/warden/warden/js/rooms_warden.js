// ===================================================
//  rooms_warden.js
//  Handles: Render Rooms, Update Room Status
// ===================================================

function renderRooms(filter = 'all') {
  const tbody = document.getElementById('rooms-tbody');
  if (!tbody) return;

  let filtered = filter === 'all'
    ? rooms
    : rooms.filter(r =>
        r.maintenance.toLowerCase().replace(' ', '_') === filter ||
        r.occupancy.toLowerCase() === filter
      );

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#6b7280;padding:24px">No rooms found for selected filter</td></tr>`;
  } else {
    tbody.innerHTML = filtered.map(r => `
      <tr>
        <td>🏠 ${r.number}</td>
        <td><span style="background:#f3f4f6;padding:3px 10px;border-radius:20px;font-size:12px">${r.type}</span></td>
        <td><span class="badge badge-${r.occupancy.toLowerCase()}">${r.occupancy}</span></td>
        <td><span class="badge ${getMaintenanceBadge(r.maintenance)}">${r.maintenance}</span></td>
        <td>${r.lastUpdated}</td>
        <td><button class="btn-update-status" onclick="updateRoomStatus(${r.id})">Update Status</button></td>
      </tr>
    `).join('');
  }

  const total       = rooms.length;
  const ready       = rooms.filter(r => r.maintenance === 'Ready').length;
  const maintenance = rooms.filter(r => r.maintenance === 'Under Maintenance').length;
  const cleaned     = rooms.filter(r => r.maintenance === 'Cleaned').length;
  setInner('room-total', total);
  setInner('room-ready', ready);
  setInner('room-maintenance', maintenance);
  setInner('room-cleaned', cleaned);
}

function getMaintenanceBadge(status) {
  if (status === 'Ready') return 'badge-ready';
  if (status === 'Under Maintenance') return 'badge-maintenance';
  if (status === 'Cleaned') return 'badge-cleaned';
  return '';
}

function updateRoomStatus(id) {
  const room = rooms.find(r => r.id === id);
  if (!room) return;
  showModal(`Update Room ${room.number} Status`, `
    <div class="form-group">
      <label>Occupancy Status</label>
      <select id="upd-occupancy" class="filter-select" style="width:100%">
        <option value="Vacant"   ${room.occupancy === 'Vacant'   ? 'selected' : ''}>Vacant</option>
        <option value="Occupied" ${room.occupancy === 'Occupied' ? 'selected' : ''}>Occupied</option>
      </select>
    </div>
    <div class="form-group">
      <label>Maintenance Status</label>
      <select id="upd-maintenance" class="filter-select" style="width:100%">
        <option value="Ready"             ${room.maintenance === 'Ready'             ? 'selected' : ''}>Ready</option>
        <option value="Under Maintenance" ${room.maintenance === 'Under Maintenance' ? 'selected' : ''}>Under Maintenance</option>
        <option value="Cleaned"           ${room.maintenance === 'Cleaned'           ? 'selected' : ''}>Cleaned</option>
      </select>
    </div>
  `, () => {
    room.occupancy   = document.getElementById('upd-occupancy').value;
    room.maintenance = document.getElementById('upd-maintenance').value;
    room.lastUpdated = new Date().toLocaleDateString('en-US');
    saveToStorage();
    renderRooms();
    closeModal();
    showToast('success', 'Room Updated', `Room ${room.number} status updated to ${room.maintenance}`);
  });
}

// ----- Filter Setup -----
function setupRoomFilter() {
  const roomFilter = document.getElementById('room-filter');
  if (roomFilter) {
    roomFilter.addEventListener('change', () => renderRooms(roomFilter.value));
  }
}
