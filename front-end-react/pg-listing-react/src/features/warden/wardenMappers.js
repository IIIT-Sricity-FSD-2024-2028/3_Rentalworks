import { normalizeStatus, toNumber } from '../../utils/normalize';

// Normalisers that turn backend rows into the shapes the warden pages render.

export function mapRoomFromDb(r) {
  const capacityType =
    r.capacity === 1
      ? 'Single'
      : r.capacity === 2
      ? 'Double'
      : r.capacity === 3
      ? 'Triple'
      : `${r.capacity} Sharing`;

  const occupancyStatus =
    r.status === 'full' || (r.currentOccupancy >= r.capacity && r.capacity > 0)
      ? 'Occupied'
      : r.currentOccupancy === 0
      ? 'Vacant'
      : `Occupied (${r.currentOccupancy}/${r.capacity})`;

  return {
    id: r.id,
    number: r.roomNumber,
    roomNumber: r.roomNumber,
    type: capacityType,
    capacity: r.capacity,
    currentOccupancy: r.currentOccupancy,
    rent: toNumber(r.rent),
    occupancy: occupancyStatus,
    status: r.status,
    maintenance: r.maintenanceStatus || 'Ready',
    maintenanceStatus: r.maintenanceStatus || 'Ready',
    lastUpdated: r.updatedAt
      ? new Date(r.updatedAt).toLocaleDateString('en-US')
      : new Date().toLocaleDateString('en-US'),
    property: r.property?.name || '',
    propertyId: r.propertyId ?? r.property?.id ?? null,
  };
}

export function mapTenantFromDb(t) {
  return {
    id: t.id,
    name: t.name,
    email: t.email,
    username: t.username || '',
    room: t.room || '—',
    bedNumber: t.bedNumber || null,
    propertyId: t.propertyId ?? null,
    phone: t.phone || '',
    checkIn: t.checkIn || '',
    rent: toNumber(t.rent),
    paymentStatus: t.paymentStatus || 'pending',
    status: t.status || 'active',
    stayStatus: t.stayStatus || null,
    endedAt: t.endedAt || null,
    endReason: t.endReason || null,
    bookingPayment: t.bookingPayment || null,
  };
}

export function mapComplaintFromDb(c, tenantsList = []) {
  let tenantName = 'Tenant';
  let tenantRoom = '—';
  let tenantId = c.tenantId;

  if (c.tenant && typeof c.tenant === 'object') {
    tenantName = c.tenant.name || 'Tenant';
    tenantId = c.tenant.id || tenantId;
  } else if (typeof c.tenant === 'string' && c.tenant.trim()) {
    tenantName = c.tenant;
  }

  if (Array.isArray(tenantsList) && tenantsList.length > 0 && tenantId) {
    const matched = tenantsList.find(t => String(t.id) === String(tenantId) || t.name === tenantName);
    if (matched && matched.room) {
      tenantRoom = matched.room;
    }
  } else if (c.room) {
    tenantRoom = typeof c.room === 'object' ? (c.room.roomNumber || '—') : String(c.room);
  }

  let compType = 'Maintenance';
  if (c.title) {
    compType = c.title;
  } else if (c.description) {
    const match = c.description.match(/(?:\[.*?\]\s*)?([^-:\n]+)/);
    if (match && match[1]) {
      compType = match[1].trim();
    } else {
      compType = 'Issue';
    }
  }

  const dateStr = c.reportedAt || 
    (c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-US') : new Date().toLocaleDateString('en-US'));

  return {
    id: c.id,
    tenant: tenantName,
    room: tenantRoom,
    type: compType,
    title: c.title || compType,
    priority: (c.priority || 'medium').toLowerCase(),
    status: normalizeStatus(c.status, 'open'),
    severity: c.severity || (c.priority === 'high' ? 'High' : c.priority === 'low' ? 'Low' : 'Medium'),
    date: dateStr,
    description: c.description || c.title || '',
    timeline: Array.isArray(c.timeline) && c.timeline.length > 0 ? c.timeline : [
      {
        time: dateStr,
        event: 'Complaint submitted by tenant',
        by: tenantName
      }
    ],
    property: c.property?.name || '',
    tenantId,
    propertyId: c.propertyId ?? null,
  };
}

export function mapWardenNotificationFromDb(n) {
  const time = n.createdAt
    ? new Date(n.createdAt).toLocaleDateString('en-US') + ' ' + new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Recently';

  let iconType = 'info';
  if (n.senderRole === 'owner') iconType = 'owner';
  else if (n.type === 'issue' || n.priority === 'high') iconType = 'warning';
  else if (n.type === 'check') iconType = 'check';

  return {
    id: n.id,
    title: n.title || 'Warden Notification',
    message: n.message || '',
    type: n.type || 'issue',
    priority: n.priority || 'medium',
    read: Boolean(n.read),
    senderName: n.senderName || 'Anonymous',
    senderRole: n.senderRole || 'tenant',
    propertyName: n.propertyName || '',
    roomNumber: n.roomNumber || '',
    time: time,
    icon: iconType,
  };
}

export function mapRuleViolationFromDb(v) {
  const tenantName = v.tenant?.name || v.tenantName || 'Tenant';
  const roomNumber = v.roomNumber || v.tenant?.room || '—';
  const dateStr = v.reportedAt || 
    (v.createdAt ? new Date(v.createdAt).toLocaleDateString('en-US') : new Date().toLocaleDateString('en-US'));

  return {
    id: v.id,
    tenantId: v.tenantId,
    tenant: tenantName,
    tenantName: tenantName,
    room: roomNumber,
    roomNumber: roomNumber,
    type: v.type,
    severity: (v.severity || 'low').toLowerCase(),
    warnings: Number(v.warningCount) || 1,
    warningCount: Number(v.warningCount) || 1,
    date: dateStr,
    reportedAt: dateStr,
    description: v.description || '',
    status: v.status || 'active',
    escalatedToOwner: Boolean(v.escalatedToOwner),
  };
}

export function mapIssueFromDb(i) {
  const tenantName = i.tenant?.name || 'Tenant';
  const dateStr = i.createdAt ? new Date(i.createdAt).toLocaleDateString('en-US') : new Date().toLocaleDateString('en-US');
  return {
    id: i.id,
    entityType: 'issue',
    tenantId: i.tenantId,
    tenant: tenantName,
    room: i.location ? i.location.replace(/^Room\s*/i, '') : (i.roomEntity?.roomNumber || '—'),
    type: i.title || i.category || 'Maintenance',
    title: i.title || i.category || 'Maintenance',
    category: i.category || 'General',
    priority: (i.priority || 'medium').toLowerCase(),
    status: normalizeStatus(i.status, 'open'),
    severity: i.priority === 'high' ? 'High' : i.priority === 'low' ? 'Low' : 'Medium',
    date: dateStr,
    createdAt: i.createdAt,
    description: i.description || i.title || '',
    timeline: [{ time: dateStr, event: `Issue submitted by ${tenantName}`, by: tenantName }],
    property: i.property?.name || '',
    propertyId: i.propertyId ?? null,
  };
}
