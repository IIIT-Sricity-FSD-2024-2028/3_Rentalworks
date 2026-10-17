import { useState, useEffect, useCallback } from 'react';
import {
  getRoomsApi,
  getTenantsApi,
  getComplaintsApi,
  getIssuesApi,
  getWardenNotificationsApi,
  getRuleViolationsApi,
} from './api';

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
    rent: Number(r.rent) || 8000,
    occupancy: occupancyStatus,
    status: r.status,
    maintenance: r.maintenanceStatus || 'Ready',
    maintenanceStatus: r.maintenanceStatus || 'Ready',
    lastUpdated: r.updatedAt
      ? new Date(r.updatedAt).toLocaleDateString('en-US')
      : new Date().toLocaleDateString('en-US'),
    property: r.property?.name || 'Sunrise PG Residency',
  };
}

export function mapTenantFromDb(t) {
  return {
    id: t.id,
    name: t.name,
    email: t.email,
    room: t.room || '101',
    phone: t.phone || '',
    checkIn: t.checkIn || '2026-01-01',
    rent: Number(t.rent) || 8000,
    paymentStatus: t.paymentStatus || 'paid',
    status: t.status || 'active',
  };
}

export function mapIssueFromDb(iss, tenantsList = []) {
  let tenantName = iss.tenant?.name || 'Arun Kumar';
  let tenantRoom = iss.location || (iss.roomEntity ? String(iss.roomEntity.roomNumber) : '102');
  let tenantId = iss.tenantId;

  if (Array.isArray(tenantsList) && tenantsList.length > 0 && tenantId) {
    const matched = tenantsList.find(t => String(t.id) === String(tenantId));
    if (matched) {
      tenantName = matched.name || tenantName;
      tenantRoom = matched.room || tenantRoom;
    }
  }

  const dateStr = iss.createdAt
    ? new Date(iss.createdAt).toLocaleDateString('en-US')
    : new Date().toLocaleDateString('en-US');

  return {
    id: iss.id,
    sourceType: 'issue',
    tenant: tenantName,
    tenantId: tenantId,
    room: tenantRoom,
    type: iss.category || 'Maintenance',
    title: iss.title,
    priority: (iss.priority || 'medium').toLowerCase(),
    status: iss.status || 'open',
    severity: iss.priority === 'high' ? 'High' : iss.priority === 'low' ? 'Low' : 'Medium',
    date: dateStr,
    description: iss.description || iss.title || '',
    timeline: [
      {
        time: dateStr,
        event: 'Issue registered by tenant',
        by: tenantName,
      },
    ],
    property: iss.property?.name || 'Sunrise PG Residency',
  };
}

export function mapComplaintFromDb(c, tenantsList = []) {
  let tenantName = 'Tenant';
  let tenantRoom = '101';
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
    tenantRoom = typeof c.room === 'object' ? (c.room.roomNumber || '101') : String(c.room);
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
    sourceType: 'complaint',
    tenant: tenantName,
    tenantId: tenantId,
    room: tenantRoom,
    type: compType,
    title: c.title || compType,
    priority: (c.priority || 'medium').toLowerCase(),
    status: c.status || 'open',
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
    property: c.property?.name || 'Sunrise PG Residency',
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
    propertyName: n.propertyName || 'Sunrise PG Residency',
    roomNumber: n.roomNumber || '',
    time: time,
    icon: iconType,
  };
}

export function mapRuleViolationFromDb(v) {
  const tenantName = v.tenant?.name || v.tenantName || 'Tenant';
  const roomNumber = v.roomNumber || v.tenant?.room || '101';
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

// Global in-memory cache to sync across components
let globalCache = {
  rooms: [],
  tenants: [],
  violations: [],
  complaints: [],
  notifications: [],
  loaded: false,
};

const listeners = new Set();
function notifyListeners() {
  listeners.forEach(fn => fn({ ...globalCache }));
}

export async function fetchLiveWardenData() {
  try {
    const [roomsRes, tenantsRes, complaintsRes, issuesRes, notifsRes, violsRes] = await Promise.allSettled([
      getRoomsApi(),
      getTenantsApi(),
      getComplaintsApi(),
      getIssuesApi(),
      getWardenNotificationsApi(),
      getRuleViolationsApi(),
    ]);

    const rooms = roomsRes.status === 'fulfilled' && Array.isArray(roomsRes.value) 
      ? roomsRes.value.map(mapRoomFromDb) 
      : [];
    const tenants = tenantsRes.status === 'fulfilled' && Array.isArray(tenantsRes.value) 
      ? tenantsRes.value.map(mapTenantFromDb) 
      : [];
    const rawComplaints = complaintsRes.status === 'fulfilled' && Array.isArray(complaintsRes.value) 
      ? complaintsRes.value 
      : [];
    const mappedComplaints = rawComplaints
      .filter(c => !c.propertyId || c.propertyId === 1 || (c.property?.name || '').includes('Sunrise') || c.tenantId === 1 || c.tenantId === 19)
      .map(c => mapComplaintFromDb(c, tenants));

    const rawIssues = issuesRes.status === 'fulfilled' && Array.isArray(issuesRes.value)
      ? issuesRes.value
      : [];
    const mappedIssues = rawIssues
      .filter(i => !i.propertyId || i.propertyId === 1 || (i.property?.name || '').includes('Sunrise') || i.tenantId === 1 || i.tenantId === 19)
      .map(i => mapIssueFromDb(i, tenants));

    // Unified list of complaints and issues for Sunrise PG Warden
    const complaints = [...mappedIssues, ...mappedComplaints];

    const rawNotifs = notifsRes.status === 'fulfilled' && Array.isArray(notifsRes.value) 
      ? notifsRes.value 
      : [];
    const notifications = rawNotifs.map(mapWardenNotificationFromDb);

    const rawViols = violsRes.status === 'fulfilled' && Array.isArray(violsRes.value) 
      ? violsRes.value 
      : [];
    const violations = rawViols.map(mapRuleViolationFromDb);

    globalCache = {
      rooms,
      tenants,
      violations,
      complaints,
      notifications,
      loaded: true,
    };

    notifyListeners();
    return globalCache;
  } catch (err) {
    console.error('Error fetching live data from Neon backend:', err);
    return globalCache;
  }
}

// Custom hook to automatically load and save state connected to backend Neon DB
export function useWardenData() {
  const [data, setData] = useState({ ...globalCache });
  const [loading, setLoading] = useState(!globalCache.loaded);

  useEffect(() => {
    const listener = (newCache) => {
      setData({ ...newCache });
      setLoading(false);
    };
    listeners.add(listener);

    // Initial load from backend if not yet loaded or on component mount
    fetchLiveWardenData().then(() => setLoading(false));

    return () => {
      listeners.delete(listener);
    };
  }, []);

  const updateData = useCallback((newDataKey, newValue) => {
    globalCache = {
      ...globalCache,
      [newDataKey]: newValue,
    };
    notifyListeners();
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    const updated = await fetchLiveWardenData();
    setLoading(false);
    return updated;
  }, []);

  return { data, loading, updateData, refreshData };
}
