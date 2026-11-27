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
  mapStayFromDb,
} from './wardenMappers';
import { fetchListings } from '../listings/listingsSlice';
import { roomsRepo, complaintsRepo, issuesRepo, wardenNotificationsRepo, ruleViolationsRepo, tenantStaysRepo } from '../repositories';
import { markWardenNotificationRead as markReadThunk, markAllWardenNotificationsRead as markAllReadThunk } from '../repositories/wardenNotificationsSlice';

// =====================================================================
//  Warden portal
//  - rooms / complaints / issues / warden notifications / rule violations /
//    tenant stays: shared repository slices (features/repositories).
//  - this slice: only warden-specific views — the enriched tenants list
//    (/tenants joins users + bookings + stays + payments), the rent ledger
//    views, session timeline notes and the bed-sync flag.
//  Pages read everything through selectWarden / useWardenData.
// =====================================================================

const msg = (err) => err?.message || 'Request failed';

/** Run a repository thunk inside a warden thunk; throw its error message. */
const viaRepo = async (dispatch, action) => {
  const result = await dispatch(action);
  if (result.error) throw new Error(result.payload || result.error.message || 'Request failed');
  return result.payload;
};

const thunk = (type, fn) =>
  createAsyncThunk(`warden/${type}`, async (arg, thunkApi) => {
    try {
      return await fn(arg, thunkApi);
    } catch (err) {
      return thunkApi.rejectWithValue(msg(err));
    }
  });

// ====================================================================
//  Load everything the warden portal needs in one round
// ====================================================================

export const fetchWardenTenants = createAsyncThunk('warden/fetchTenants', async (_, { rejectWithValue }) => {
  try {
    return asArray(await api.getTenantsApi());
  } catch (err) {
    return rejectWithValue(msg(err));
  }
});

export const fetchWardenData = createAsyncThunk('warden/fetchAll', async (_, { dispatch }) => {
  const results = await Promise.all([
    dispatch(roomsRepo.thunks.fetchAll()),
    dispatch(fetchWardenTenants()),
    dispatch(complaintsRepo.thunks.fetchAll()),
    dispatch(issuesRepo.thunks.fetchAll()),
    dispatch(wardenNotificationsRepo.thunks.fetchAll()),
    dispatch(ruleViolationsRepo.thunks.fetchAll()),
    dispatch(tenantStaysRepo.thunks.fetchAll()),
  ]);
  const failed = results.find((r) => r.error);
  return { error: failed ? failed.payload || 'Some warden data could not be loaded' : null };
});

// ====================================================================
//  Mutations: CRUD goes through the repository slices; workflow actions
//  (warnings, eviction, offline payment …) call their endpoints and then
//  refresh the affected repository.
// ====================================================================

// Rooms
export const createRoom = thunk('createRoom', (data, { dispatch }) => viaRepo(dispatch, roomsRepo.thunks.createItem(data)));
export const updateRoom = thunk('updateRoom', ({ id, changes }, { dispatch }) => viaRepo(dispatch, roomsRepo.thunks.updateItem({ id, changes })));
export const deleteRoom = thunk('deleteRoom', (id, { dispatch }) => viaRepo(dispatch, roomsRepo.thunks.removeItem(id)));

// Tenant changes move people in and out of beds, so afterwards reload the
// warden data and the public listings so bed counts agree everywhere.
const occupancyThunk = (type, fn) =>
  thunk(type, async (arg, { dispatch }) => {
    const result = await fn(arg);
    dispatch(fetchWardenData());
    dispatch(fetchListings());
    return result;
  });

// Tenants (server keeps booking / stay / payment in sync)
export const createTenant = occupancyThunk('createTenant', (data) => api.createTenantApi(data));
export const updateTenant = occupancyThunk('updateTenant', ({ id, changes }) => api.updateTenantApi(id, changes));
export const deleteTenant = occupancyThunk('deleteTenant', async (id) => {
  await api.deleteTenantApi(id);
  return id;
});

// Complaints & issues (the API notifies the tenant about status changes)
export const updateComplaintStatus = thunk('updateComplaintStatus', async ({ id, entityType, changes }, { dispatch }) => {
  const repo = entityType === 'issue' ? issuesRepo : complaintsRepo;
  await viaRepo(dispatch, repo.thunks.updateItem({ id, changes }));
  return { id, entityType, changes };
});
export const notifyTenantMessage = thunk('notifyTenantMessage', (data) => api.sendTenantNotificationApi(data));

// Warden notifications
export const markWardenNotificationRead = thunk('markNotificationRead', (id, { dispatch }) => viaRepo(dispatch, markReadThunk(id)));
export const markAllWardenNotificationsRead = thunk('markAllNotificationsRead', (_, { dispatch }) => viaRepo(dispatch, markAllReadThunk()));
export const deleteWardenNotification = thunk('deleteNotification', (id, { dispatch }) => viaRepo(dispatch, wardenNotificationsRepo.thunks.removeItem(id)));

// Rule violations
const refetchViolations = (dispatch) => dispatch(ruleViolationsRepo.thunks.fetchAll());
export const createViolation = thunk('createViolation', (data, { dispatch }) => viaRepo(dispatch, ruleViolationsRepo.thunks.createItem(data)));
export const updateViolation = thunk('updateViolation', ({ id, changes }, { dispatch }) => viaRepo(dispatch, ruleViolationsRepo.thunks.updateItem({ id, changes })));
export const deleteViolation = thunk('deleteViolation', (id, { dispatch }) => viaRepo(dispatch, ruleViolationsRepo.thunks.removeItem(id)));
export const issueViolationWarning = thunk('issueViolationWarning', async (id, { dispatch }) => {
  const row = await api.issueRuleViolationWarningApi(id);
  await refetchViolations(dispatch);
  return row;
});
export const escalateViolation = thunk('escalateViolation', async (id, { dispatch }) => {
  const row = await api.escalateRuleViolationApi(id);
  await refetchViolations(dispatch);
  return row;
});

// Rent ledger & tenant actions
export const fetchRentLedger = thunk('fetchRentLedger', ({ month, propertyId }) => api.getRentLedgerApi(month, propertyId));
export const fetchTenantLedger = thunk('fetchTenantLedger', async (tenantId) => {
  const [ledger, audit] = await Promise.all([api.getTenantLedgerApi(tenantId), api.getAuditLogsApi({ tenantId }).catch(() => [])]);
  return { tenantId, ledger, audit: asArray(audit) };
});
export const markRentPaidOffline = thunk('markRentPaidOffline', ({ dueId, note }) => api.markRentPaidOfflineApi(dueId, note));
export const waiveRent = thunk('waiveRent', ({ dueId, reason }) => api.waiveRentApi(dueId, reason));
export const notifyTenant = thunk('notifyTenant', ({ tenantId, payload }) => api.notifyTenantApi(tenantId, payload));
export const escalateTenant = thunk('escalateTenant', ({ tenantId, payload }) => api.escalateTenantApi(tenantId, payload));
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
      await viaRepo(dispatch, roomsRepo.thunks.updateItem({ id: r.id, changes }));
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

// ====================================================================
//  Slice: warden-only state
// ====================================================================

const wardenSlice = createSlice({
  name: 'warden',
  initialState: {
    tenantsRaw: [],
    // Timeline notes added during this session, keyed "complaint:12" / "issue:4".
    events: {},
    syncing: false,
    loaded: false,
    status: 'idle',
    error: null,
    ledger: { month: null, data: null, status: 'idle', error: null },
    tenantLedger: { tenantId: null, ledger: null, audit: [], status: 'idle', error: null },
  },
  reducers: {
    /** Add a line to a complaint's timeline for this session. */
    addComplaintEvent(state, { payload: { id, entityType, event, by } }) {
      const key = `${entityType}:${id}`;
      state.events[key] = [...(state.events[key] || []), { time: new Date().toLocaleString(), event, by }];
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchWardenTenants.fulfilled, (s, { payload }) => {
      s.tenantsRaw = payload;
    })
      .addCase(fetchWardenData.pending, (s) => {
        s.status = 'loading';
      })
      .addCase(fetchWardenData.fulfilled, (s, { payload }) => {
        s.loaded = true;
        s.status = 'succeeded';
        s.error = payload.error;
      })
      .addCase(fetchWardenData.rejected, (s, { error }) => {
        s.status = 'failed';
        s.error = error.message;
        s.loaded = true;
      })
      .addCase(deleteTenant.fulfilled, (s, { payload }) => {
        s.tenantsRaw = s.tenantsRaw.filter((t) => String(t.id) !== String(payload));
      })
      .addCase(syncBedCounts.pending, (s) => {
        s.syncing = true;
      })
      .addCase(syncBedCounts.fulfilled, (s) => {
        s.syncing = false;
      })
      .addCase(syncBedCounts.rejected, (s) => {
        s.syncing = false;
      })
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
  },
});

export const { addComplaintEvent } = wardenSlice.actions;

export const wardenReducers = { warden: wardenSlice.reducer };

// ---- selectors: repository rows mapped into the shapes warden pages use

const selectWardenTenants = createSelector([(s) => s.warden.tenantsRaw], (rows) => rows.map(mapTenantFromDb));
const selectWardenRooms = createSelector([roomsRepo.selectors.selectItems], (rows) => rows.map(mapRoomFromDb));
const selectWardenStays = createSelector([tenantStaysRepo.selectors.selectItems], (rows) => rows.map(mapStayFromDb).filter((s) => s.status === 'active'));
const selectStaysLoaded = (s) => s.tenantStays.status === 'succeeded';
const selectWardenComplaints = createSelector(
  [complaintsRepo.selectors.selectItems, issuesRepo.selectors.selectItems, selectWardenTenants, (s) => s.warden.events],
  (complaints, issues, tenants, events) =>
    [...complaints.map((c) => ({ ...mapComplaintFromDb(c, tenants), entityType: 'complaint' })), ...issues.map(mapIssueFromDb)].map((c) => {
      const extra = events[`${c.entityType}:${c.id}`];
      return extra ? { ...c, timeline: [...(c.timeline || []), ...extra] } : c;
    }),
);
const selectWardenNotifications = createSelector([wardenNotificationsRepo.selectors.selectItems], (rows) => rows.map(mapWardenNotificationFromDb));
const selectWardenViolations = createSelector([ruleViolationsRepo.selectors.selectItems], (rows) => rows.map(mapRuleViolationFromDb));

/** Everything the warden pages render, read from the store. */
export const selectWarden = createSelector(
  [selectWardenRooms, selectWardenTenants, selectWardenComplaints, selectWardenNotifications, selectWardenViolations, selectWardenStays, selectStaysLoaded, (s) => s.warden],
  (rooms, tenants, complaints, notifications, violations, stays, staysLoaded, w) => ({
    rooms,
    tenants,
    complaints,
    notifications,
    violations,
    stays,
    staysLoaded,
    syncing: w.syncing,
    loaded: w.loaded,
    status: w.status,
    error: w.error,
    ledger: w.ledger,
    tenantLedger: w.tenantLedger,
  }),
);
export const selectWardenUnreadCount = createSelector([selectWardenNotifications], (list) => list.filter((n) => !n.read).length);
export const selectWardenLedger = (s) => s.warden.ledger;
export const selectWardenTenantLedger = (s) => s.warden.tenantLedger;

/**
 * Beds as they really are (active stays) next to what each room has stored.
 *  - rooms[].actual      people actually staying in the room
 *  - rooms[].stored      rooms.currentOccupancy, what the listing and booking use
 *  - rooms[].outOfSync   the two differ, fixed by syncBedCounts
 *  - rooms[].overbooked  more people than beds, someone has to move
 */
export const selectOccupancyReport = createSelector([selectWardenRooms, selectWardenStays, selectWardenTenants, selectStaysLoaded], (rooms, stays, tenants, staysLoaded) => {
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
    multiBedTenants: activeTenants.filter((t) => (bedsByTenant.get(String(t.id)) || []).length > 1).map((t) => ({ ...t, beds: bedsByTenant.get(String(t.id)) })),
  };
});
