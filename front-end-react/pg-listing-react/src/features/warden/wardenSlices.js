import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { asArray } from '../../services/apiClient';
import * as api from '../../dashboards/warden/utils/api';
import {
  mapRoomFromDb,
  mapTenantFromDb,
  mapComplaintFromDb,
  mapIssueFromDb,
  mapWardenNotificationFromDb,
  mapRuleViolationFromDb,
<<<<<<< HEAD
} from './wardenMappers';
=======
  mapStayFromDb,
} from './wardenMappers';
import { fetchListings } from '../listings/listingsSlice';
>>>>>>> redux-migration

const msg = (err) => err?.message || 'Request failed';
const sameId = (a, b) => String(a) === String(b);

// ====================================================================
//  Load everything the warden portal needs in one round trip
// ====================================================================

export const fetchWardenData = createAsyncThunk('warden/fetchAll', async () => {
<<<<<<< HEAD
  const [rooms, tenants, complaints, issues, notifications, violations] = await Promise.allSettled([
=======
  const [rooms, tenants, complaints, issues, notifications, violations, stays] = await Promise.allSettled([
>>>>>>> redux-migration
    api.getRoomsApi(),
    api.getTenantsApi(),
    api.getComplaintsApi(),
    api.getIssuesApi(),
    api.getWardenNotificationsApi(),
    api.getRuleViolationsApi(),
<<<<<<< HEAD
  ]);
  const ok = (r) => (r.status === 'fulfilled' ? asArray(r.value) : []);
  const mappedTenants = ok(tenants).map(mapTenantFromDb);
  const failures = [rooms, tenants, complaints, issues, notifications, violations].filter((r) => r.status === 'rejected');
=======
    api.getStaysApi(),
  ]);
  const ok = (r) => (r.status === 'fulfilled' ? asArray(r.value) : []);
  const mappedTenants = ok(tenants).map(mapTenantFromDb);
  const failures = [rooms, tenants, complaints, issues, notifications, violations, stays].filter((r) => r.status === 'rejected');
>>>>>>> redux-migration
  return {
    rooms: ok(rooms).map(mapRoomFromDb),
    tenants: mappedTenants,
    complaints: [
      ...ok(complaints).map((c) => ({ ...mapComplaintFromDb(c, mappedTenants), entityType: 'complaint' })),
      ...ok(issues).map(mapIssueFromDb),
    ],
    notifications: ok(notifications).map(mapWardenNotificationFromDb),
    violations: ok(violations).map(mapRuleViolationFromDb),
<<<<<<< HEAD
=======
    stays: ok(stays).map(mapStayFromDb).filter((s) => s.status === 'active'),
    staysLoaded: stays.status === 'fulfilled',
>>>>>>> redux-migration
    error: failures.length ? msg(failures[0].reason) : null,
  };
});

// ====================================================================
//  Mutations (each refreshes the affected collection in the slice)
// ====================================================================

const thunk = (type, fn) =>
  createAsyncThunk(`warden/${type}`, async (arg, { rejectWithValue }) => {
    try {
      return await fn(arg);
    } catch (err) {
      return rejectWithValue(msg(err));
    }
  });

// Rooms
export const createRoom = thunk('createRoom', async (data) => mapRoomFromDb(await api.createRoomApi(data)));
export const updateRoom = thunk('updateRoom', async ({ id, changes }) => mapRoomFromDb(await api.updateRoomApi(id, changes)));
export const deleteRoom = thunk('deleteRoom', async (id) => {
  await api.deleteRoomApi(id);
  return id;
});

<<<<<<< HEAD
// Tenants (server keeps booking / stay / payment in sync)
export const createTenant = thunk('createTenant', (data) => api.createTenantApi(data));
export const updateTenant = thunk('updateTenant', ({ id, changes }) => api.updateTenantApi(id, changes));
export const deleteTenant = thunk('deleteTenant', async (id) => {
=======
// Tenant changes move people in and out of beds, so afterwards reload the
// warden data and the public listings so bed counts agree everywhere.
const occupancyThunk = (type, fn) =>
  createAsyncThunk(`warden/${type}`, async (arg, { dispatch, rejectWithValue }) => {
    try {
      const result = await fn(arg);
      dispatch(fetchWardenData());
      dispatch(fetchListings());
      return result;
    } catch (err) {
      return rejectWithValue(msg(err));
    }
  });

// Tenants (server keeps booking / stay / payment in sync)
export const createTenant = occupancyThunk('createTenant', (data) => api.createTenantApi(data));
export const updateTenant = occupancyThunk('updateTenant', ({ id, changes }) => api.updateTenantApi(id, changes));
export const deleteTenant = occupancyThunk('deleteTenant', async (id) => {
>>>>>>> redux-migration
  await api.deleteTenantApi(id);
  return id;
});

// Complaints & issues
export const updateComplaintStatus = thunk('updateComplaintStatus', async ({ id, entityType, changes }) => {
  if (entityType === 'issue') await api.updateIssueApi(id, changes);
  else await api.updateComplaintApi(id, changes);
  return { id, entityType, changes };
});
export const notifyTenantMessage = thunk('notifyTenantMessage', (data) => api.sendTenantNotificationApi(data));

// Warden notifications
export const markWardenNotificationRead = thunk('markNotificationRead', async (id) => {
  await api.markWardenNotificationReadApi(id);
  return id;
});
export const markAllWardenNotificationsRead = thunk('markAllNotificationsRead', async () => {
  await api.markAllWardenNotificationsReadApi();
  return true;
});
export const deleteWardenNotification = thunk('deleteNotification', async (id) => {
  await api.deleteWardenNotificationApi(id);
  return id;
});

// Rule violations
export const createViolation = thunk('createViolation', async (data) => mapRuleViolationFromDb(await api.createRuleViolationApi(data)));
export const issueViolationWarning = thunk('issueViolationWarning', async (id) => mapRuleViolationFromDb(await api.issueRuleViolationWarningApi(id)));
export const escalateViolation = thunk('escalateViolation', async (id) => mapRuleViolationFromDb(await api.escalateRuleViolationApi(id)));
export const updateViolation = thunk('updateViolation', async ({ id, changes }) => mapRuleViolationFromDb(await api.updateRuleViolationApi(id, changes)));
export const deleteViolation = thunk('deleteViolation', async (id) => {
  await api.deleteRuleViolationApi(id);
  return id;
});

// Rent ledger & tenant actions
export const fetchRentLedger = thunk('fetchRentLedger', ({ month, propertyId }) => api.getRentLedgerApi(month, propertyId));
export const fetchTenantLedger = thunk('fetchTenantLedger', async (tenantId) => {
  const [ledger, audit] = await Promise.all([
    api.getTenantLedgerApi(tenantId),
    api.getAuditLogsApi({ tenantId }).catch(() => []),
  ]);
  return { tenantId, ledger, audit: asArray(audit) };
});
export const markRentPaidOffline = thunk('markRentPaidOffline', ({ dueId, note }) => api.markRentPaidOfflineApi(dueId, note));
export const waiveRent = thunk('waiveRent', ({ dueId, reason }) => api.waiveRentApi(dueId, reason));
export const notifyTenant = thunk('notifyTenant', ({ tenantId, payload }) => api.notifyTenantApi(tenantId, payload));
export const escalateTenant = thunk('escalateTenant', ({ tenantId, payload }) => api.escalateTenantApi(tenantId, payload));
<<<<<<< HEAD
export const evictTenant = thunk('evictTenant', ({ tenantId, reason }) => api.evictTenantApi(tenantId, reason));
=======
export const evictTenant = occupancyThunk('evictTenant', ({ tenantId, reason }) => api.evictTenantApi(tenantId, reason));

/**
 * Sets each room's stored bed count (rooms.currentOccupancy) to the number of
 * active stays in it. The listing, booking and owner pages all read that
 * stored count, so this is what brings them back in line with real residents.
 * The server then marks each room full / available itself.
 */
export const syncBedCounts = createAsyncThunk('warden/syncBedCounts', async (_, { getState, dispatch, rejectWithValue }) => {
  const fixes = selectOccupancyReport(getState()).rooms.filter((r) => r.outOfSync);
  let done = 0;
  try {
    for (const r of fixes) {
      const changes = { currentOccupancy: r.actual };
      // Don't let the recount take a room out of maintenance.
      if (r.status === 'maintenance') changes.status = 'maintenance';
      await api.updateRoomApi(r.id, changes);
      done += 1;
    }
    return done;
  } catch (err) {
    return rejectWithValue(`${msg(err)} (${done} of ${fixes.length} rooms updated)`);
  } finally {
    dispatch(fetchWardenData());
    dispatch(fetchListings());
  }
});
>>>>>>> redux-migration

// ====================================================================
//  Slice
// ====================================================================

const wardenSlice = createSlice({
  name: 'warden',
  initialState: {
    rooms: [],
    tenants: [],
    complaints: [],
    notifications: [],
    violations: [],
<<<<<<< HEAD
=======
    stays: [],
    staysLoaded: false,
    syncing: false,
>>>>>>> redux-migration
    loaded: false,
    status: 'idle',
    error: null,
    ledger: { month: null, data: null, status: 'idle', error: null },
    tenantLedger: { tenantId: null, ledger: null, audit: [], status: 'idle', error: null },
  },
  reducers: {
    /** Add a line to a complaint's timeline for this session. */
    addComplaintEvent(state, { payload: { id, entityType, event, by } }) {
      const c = state.complaints.find((x) => sameId(x.id, id) && x.entityType === entityType);
      if (c) c.timeline = [...(c.timeline || []), { time: new Date().toLocaleString(), event, by }];
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchWardenData.pending, (s) => {
      s.status = 'loading';
    })
      .addCase(fetchWardenData.fulfilled, (s, { payload }) => {
        const { error, ...data } = payload;
        Object.assign(s, data);
        s.loaded = true;
        s.status = 'succeeded';
        s.error = error;
      })
      .addCase(fetchWardenData.rejected, (s, { error }) => {
        s.status = 'failed';
        s.error = error.message;
        s.loaded = true;
      })
<<<<<<< HEAD
=======
      .addCase(syncBedCounts.pending, (s) => {
        s.syncing = true;
      })
      .addCase(syncBedCounts.fulfilled, (s) => {
        s.syncing = false;
      })
      .addCase(syncBedCounts.rejected, (s) => {
        s.syncing = false;
      })
>>>>>>> redux-migration
      // rooms
      .addCase(createRoom.fulfilled, (s, { payload }) => {
        s.rooms.push(payload);
      })
      .addCase(updateRoom.fulfilled, (s, { payload }) => {
        const i = s.rooms.findIndex((r) => sameId(r.id, payload.id));
        if (i >= 0) s.rooms[i] = payload;
      })
      .addCase(deleteRoom.fulfilled, (s, { payload }) => {
        s.rooms = s.rooms.filter((r) => !sameId(r.id, payload));
      })
      .addCase(deleteTenant.fulfilled, (s, { payload }) => {
        s.tenants = s.tenants.filter((t) => !sameId(t.id, payload));
      })
      // complaints
      .addCase(updateComplaintStatus.fulfilled, (s, { payload }) => {
        const c = s.complaints.find((x) => sameId(x.id, payload.id) && x.entityType === payload.entityType);
        if (c) Object.assign(c, payload.changes);
      })
      // notifications
      .addCase(markWardenNotificationRead.fulfilled, (s, { payload }) => {
        const n = s.notifications.find((x) => sameId(x.id, payload));
        if (n) n.read = true;
      })
      .addCase(markAllWardenNotificationsRead.fulfilled, (s) => {
        s.notifications.forEach((n) => {
          n.read = true;
        });
      })
      .addCase(deleteWardenNotification.fulfilled, (s, { payload }) => {
        s.notifications = s.notifications.filter((n) => !sameId(n.id, payload));
      })
      // violations
      .addCase(createViolation.fulfilled, (s, { payload }) => {
        s.violations.unshift(payload);
      })
      .addCase(deleteViolation.fulfilled, (s, { payload }) => {
        s.violations = s.violations.filter((v) => !sameId(v.id, payload));
      })
      // ledger
      .addCase(fetchRentLedger.pending, (s, { meta }) => {
        s.ledger = { ...s.ledger, month: meta.arg.month, status: 'loading', error: null };
      })
      .addCase(fetchRentLedger.fulfilled, (s, { payload }) => {
        s.ledger.data = payload;
        s.ledger.status = 'succeeded';
      })
      .addCase(fetchRentLedger.rejected, (s, { payload }) => {
        s.ledger.status = 'failed';
        s.ledger.error = payload;
      })
      .addCase(fetchTenantLedger.pending, (s, { meta }) => {
        s.tenantLedger = { tenantId: meta.arg, ledger: null, audit: [], status: 'loading', error: null };
      })
      .addCase(fetchTenantLedger.fulfilled, (s, { payload }) => {
        s.tenantLedger = { ...payload, status: 'succeeded', error: null };
      })
      .addCase(fetchTenantLedger.rejected, (s, { payload }) => {
        s.tenantLedger.status = 'failed';
        s.tenantLedger.error = payload;
      });

    // Violations returned from warning / escalate / update replace the row.
    [issueViolationWarning, escalateViolation, updateViolation].forEach((t) =>
      b.addCase(t.fulfilled, (s, { payload }) => {
        const i = s.violations.findIndex((v) => sameId(v.id, payload.id));
        if (i >= 0) s.violations[i] = { ...s.violations[i], ...payload };
      }),
    );
  },
});

export const { addComplaintEvent } = wardenSlice.actions;

export const wardenReducers = { warden: wardenSlice.reducer };

// ---- selectors
export const selectWarden = (s) => s.warden;
export const selectWardenUnreadCount = createSelector([(s) => s.warden.notifications], (list) => list.filter((n) => !n.read).length);
export const selectWardenLedger = (s) => s.warden.ledger;
export const selectWardenTenantLedger = (s) => s.warden.tenantLedger;
<<<<<<< HEAD
=======

/**
 * Beds as they really are (active stays) next to what each room has stored.
 *  - rooms[].actual      people actually staying in the room
 *  - rooms[].stored      rooms.currentOccupancy, what the listing and booking use
 *  - rooms[].outOfSync   the two differ, fixed by syncBedCounts
 *  - rooms[].overbooked  more people than beds, someone has to move
 */
export const selectOccupancyReport = createSelector(
  [(s) => s.warden.rooms, (s) => s.warden.stays, (s) => s.warden.tenants, (s) => s.warden.staysLoaded],
  (rooms, stays, tenants, staysLoaded) => {
    const byRoom = new Map();
    stays.forEach((st) => {
      const key = String(st.roomId);
      if (!byRoom.has(key)) byRoom.set(key, []);
      byRoom.get(key).push(st);
    });

    const roomRows = rooms.map((r) => {
      const occupants = byRoom.get(String(r.id)) || [];
      const capacity = Number(r.capacity) || 0;
      const actual = occupants.length;
      const stored = Number(r.currentOccupancy) || 0;
      return {
        id: r.id,
        roomNumber: r.roomNumber,
        propertyId: r.propertyId,
        propertyName: r.property,
        capacity,
        status: r.status,
        actual,
        stored,
        free: Math.max(0, capacity - actual),
        occupants,
        outOfSync: staysLoaded && actual !== stored,
        overbooked: actual > capacity,
      };
    });

    const props = new Map();
    roomRows.forEach((r) => {
      const key = String(r.propertyId);
      if (!props.has(key)) props.set(key, { propertyId: r.propertyId, name: r.propertyName || `PG #${r.propertyId}`, rooms: 0, beds: 0, residents: 0, free: 0 });
      const p = props.get(key);
      p.rooms += 1;
      p.beds += r.capacity;
      p.residents += r.actual;
      p.free += r.free;
    });

    const bedsByTenant = new Map();
    stays.forEach((st) => bedsByTenant.set(String(st.tenantId), [...(bedsByTenant.get(String(st.tenantId)) || []), st]));
    const activeTenants = tenants.filter((t) => t.status !== 'evicted' && t.stayStatus !== 'evicted');

    return {
      staysLoaded,
      rooms: roomRows,
      properties: [...props.values()].sort((a, b) => b.residents - a.residents),
      residents: stays.length,
      totalBeds: roomRows.reduce((n, r) => n + r.capacity, 0),
      freeBeds: roomRows.reduce((n, r) => n + r.free, 0),
      fullRooms: roomRows.filter((r) => r.capacity > 0 && r.actual >= r.capacity).length,
      outOfSync: roomRows.filter((r) => r.outOfSync),
      overbooked: roomRows.filter((r) => r.overbooked),
      staysWithoutRoom: stays.filter((st) => !st.roomId),
      bedsByTenant,
      tenantsWithBed: activeTenants.filter((t) => bedsByTenant.has(String(t.id))).length,
      tenantsWithoutBed: activeTenants.filter((t) => !bedsByTenant.has(String(t.id))),
      multiBedTenants: activeTenants
        .filter((t) => (bedsByTenant.get(String(t.id)) || []).length > 1)
        .map((t) => ({ ...t, beds: bedsByTenant.get(String(t.id)) })),
    };
  },
);
>>>>>>> redux-migration
