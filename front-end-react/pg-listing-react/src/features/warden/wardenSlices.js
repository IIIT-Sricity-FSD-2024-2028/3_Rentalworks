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

const msg = (err) => err?.message || 'Request failed';
const sameId = (a, b) => String(a) === String(b);

// ====================================================================
//  Load everything the warden portal needs in one round trip
// ====================================================================

export const fetchWardenData = createAsyncThunk('warden/fetchAll', async () => {
  const [rooms, tenants, complaints, issues, notifications, violations, stays] = await Promise.allSettled([
    api.getRoomsApi(),
    api.getTenantsApi(),
    api.getComplaintsApi(),
    api.getIssuesApi(),
    api.getWardenNotificationsApi(),
    api.getRuleViolationsApi(),
    api.getStaysApi(),
  ]);
  const ok = (r) => (r.status === 'fulfilled' ? asArray(r.value) : []);
  const mappedTenants = ok(tenants).map(mapTenantFromDb);
  const failures = [rooms, tenants, complaints, issues, notifications, violations, stays].filter((r) => r.status === 'rejected');
  return {
    rooms: ok(rooms).map(mapRoomFromDb),
    tenants: mappedTenants,
    complaints: [
      ...ok(complaints).map((c) => ({ ...mapComplaintFromDb(c, mappedTenants), entityType: 'complaint' })),
      ...ok(issues).map(mapIssueFromDb),
    ],
    notifications: ok(notifications).map(mapWardenNotificationFromDb),
    violations: ok(violations).map(mapRuleViolationFromDb),
    stays: ok(stays).map(mapStayFromDb),
    staysLoaded: stays.status === 'fulfilled',
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
export const evictTenant = occupancyThunk('evictTenant', ({ tenantId, reason }) => api.evictTenantApi(tenantId, reason));

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
    stays: [],
    staysLoaded: false,
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

/**
 * Tenant Records lists only people who have booked a PG (they have a stay).
 * Each row gets the PG and room of their current stay, or of their last stay
 * when they have left / been removed.
 */
export const selectBookedTenants = createSelector(
  [(s) => s.warden.tenants, (s) => s.warden.stays, (s) => s.warden.staysLoaded],
  (tenants, stays, staysLoaded) => {
    if (!staysLoaded) return tenants;
    const byTenant = new Map();
    stays.forEach((st) => {
      const key = String(st.tenantId);
      if (!byTenant.has(key)) byTenant.set(key, []);
      byTenant.get(key).push(st);
    });
    return tenants
      .filter((t) => byTenant.has(String(t.id)))
      .map((t) => {
        const list = byTenant.get(String(t.id));
        const current = list.filter((st) => st.status === 'active');
        const shown = current.length ? current : list;
        return { ...t, stays: shown, pgName: shown[0]?.propertyName || '' };
      });
  },
);
