import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { http, qs, asArray } from '../../services/apiClient';
import { createResourceSlice } from '../shared/createResourceSlice';

// Tenant endpoints such as /issues/my derive identity from the x-user-id header.

// ====================================================================
//  Resource slices (list / create / update / delete)
// ====================================================================

export const tenantIssues = createResourceSlice({
  name: 'tenantIssues',
  api: {
    list: () => http.get('/issues/my'),
    create: (data) => http.post('/issues', data),
    update: (id, changes) => http.patch(`/issues/${id}`, changes),
    remove: (id) => http.delete(`/issues/${id}`),
  },
});

export const tenantComplaints = createResourceSlice({
  name: 'tenantComplaints',
  api: {
    list: () => http.get('/complaints/my'),
    create: (data) => http.post('/complaints', data),
    remove: (id) => http.delete(`/complaints/${id}`),
  },
});

export const tenantServiceRequests = createResourceSlice({
  name: 'tenantServiceRequests',
  api: {
    list: () => http.get('/service-requests/my'),
    create: (data) => http.post('/service-requests', data),
    update: (id, changes) => http.patch(`/service-requests/${id}`, changes),
    remove: (id) => http.delete(`/service-requests/${id}`),
  },
});

/** Catalogue of services offered at the tenant's property. */
export const tenantServicesCatalog = createResourceSlice({
  name: 'tenantServicesCatalog',
  api: { list: (propertyId) => http.get(`/services${qs({ propertyId })}`) },
});

export const tenantPayments = createResourceSlice({
  name: 'tenantPayments',
  api: {
    list: (tenantId) => http.get(`/payments${qs({ tenantId })}`),
    create: (data) => http.post('/payments', data),
  },
});

export const tenantNotifications = createResourceSlice({
  name: 'tenantNotifications',
  api: { list: () => http.get('/notifications') },
  mapItem: (n) => ({ ...n, read: Boolean(n.read || n.isRead) }),
});

// ---- notification actions (mark read / mark all read)
export const markTenantNotificationRead = createAsyncThunk('tenantNotifications/markRead', async (id, { rejectWithValue }) => {
  try {
    await http.patch(`/notifications/${id}/read`);
    return id;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const markAllTenantNotificationsRead = createAsyncThunk('tenantNotifications/markAllRead', async (_, { rejectWithValue }) => {
  try {
    await http.patch('/notifications/read-all');
    return true;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

// ====================================================================
//  Rent ledger (dues + pay)
// ====================================================================

export const fetchMyRentDues = createAsyncThunk('tenantRent/fetchMyRentDues', async (_, { rejectWithValue }) => {
  try {
    return asArray(await http.get('/rent-dues/my'));
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const payRentDue = createAsyncThunk('tenantRent/payRentDue', async ({ dueId, method, transactionId }, { rejectWithValue }) => {
  try {
    const result = await http.post(`/rent-dues/${dueId}/pay`, { method, transactionId });
    return { dueId, result };
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

const tenantRentSlice = createSlice({
  name: 'tenantRent',
  initialState: { dues: [], status: 'idle', error: null, paying: false, payError: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchMyRentDues.pending, (s) => {
      s.status = 'loading';
      s.error = null;
    })
      .addCase(fetchMyRentDues.fulfilled, (s, { payload }) => {
        s.status = 'succeeded';
        s.dues = payload;
      })
      .addCase(fetchMyRentDues.rejected, (s, { payload }) => {
        s.status = 'failed';
        s.error = payload;
      })
      .addCase(payRentDue.pending, (s) => {
        s.paying = true;
        s.payError = null;
      })
      .addCase(payRentDue.fulfilled, (s, { payload }) => {
        s.paying = false;
        const due = s.dues.find((d) => String(d.id) === String(payload.dueId));
        const updated = payload.result?.due || payload.result;
        if (due) Object.assign(due, updated && updated.id === due.id ? updated : {}, { status: 'paid', effectiveStatus: 'paid', paidAt: new Date().toISOString() });
      })
      .addCase(payRentDue.rejected, (s, { payload }) => {
        s.paying = false;
        s.payError = payload;
      });
  },
});

// ====================================================================
//  Stay: the tenant's active booking
// ====================================================================

export const fetchMyStay = createAsyncThunk('tenantStay/fetchMyStay', async (_, { getState, rejectWithValue }) => {
  const id = getState().auth.user?.id;
  if (!id) return null;
  try {
    const bookings = asArray(await http.get(`/bookings${qs({ tenantId: id })}`)).filter(
      (b) => Number(b.tenantId ?? b.tenant?.id) === Number(id),
    );
    const active =
      bookings.find((b) => ['confirmed', 'active'].includes(String(b.status).toLowerCase())) || bookings[0] || null;
    return { active, all: bookings };
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

const tenantStaySlice = createSlice({
  name: 'tenantStay',
  initialState: { activeBooking: null, bookings: [], status: 'idle', error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchMyStay.pending, (s) => {
      s.status = 'loading';
    })
      .addCase(fetchMyStay.fulfilled, (s, { payload }) => {
        s.status = 'succeeded';
        s.activeBooking = payload?.active || null;
        s.bookings = payload?.all || [];
      })
      .addCase(fetchMyStay.rejected, (s, { payload }) => {
        s.status = 'failed';
        s.error = payload;
      });
  },
});

// Patch notifications reducer with read actions.
const notificationsReducer = (state, action) => {
  const next = tenantNotifications.reducer(state, action);
  if (action.type === markTenantNotificationRead.fulfilled.type) {
    return { ...next, items: next.items.map((n) => (String(n.id) === String(action.payload) ? { ...n, read: true, isRead: true } : n)) };
  }
  if (action.type === markAllTenantNotificationsRead.fulfilled.type) {
    return { ...next, items: next.items.map((n) => ({ ...n, read: true, isRead: true })) };
  }
  return next;
};

// ====================================================================
//  Store wiring + selectors
// ====================================================================

export const tenantReducers = {
  tenantIssues: tenantIssues.reducer,
  tenantComplaints: tenantComplaints.reducer,
  tenantServiceRequests: tenantServiceRequests.reducer,
  tenantServicesCatalog: tenantServicesCatalog.reducer,
  tenantPayments: tenantPayments.reducer,
  tenantNotifications: notificationsReducer,
  tenantRent: tenantRentSlice.reducer,
  tenantStay: tenantStaySlice.reducer,
};

export const selectTenantStay = (s) => s.tenantStay;
export const selectActiveBooking = (s) => s.tenantStay.activeBooking;
export const selectRentDues = (s) => s.tenantRent.dues;
export const selectRentState = (s) => s.tenantRent;

export const selectUnreadTenantNotifications = createSelector(
  [tenantNotifications.selectors.selectItems],
  (items) => items.filter((n) => !n.read).length,
);

export const selectNextDue = createSelector([selectRentDues], (dues) =>
  [...dues]
    .filter((d) => ['upcoming', 'due_soon', 'overdue'].includes(d.effectiveStatus || d.status))
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))[0] || null,
);

export const selectAmountDue = createSelector([selectRentDues], (dues) =>
  dues.filter((d) => ['due_soon', 'overdue'].includes(d.effectiveStatus || d.status)).reduce((sum, d) => sum + Number(d.amount || 0), 0),
);

