import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { http, qs, asArray } from '../../services/apiClient';

import {
  issuesRepo,
  complaintsRepo,
  serviceRequestsRepo,
  servicesRepo,
  paymentsRepo,
  notificationsRepo,
} from '../repositories';
import { markNotificationRead, markAllNotificationsRead } from '../repositories/notificationsSlice';

// The tenant portal reads the shared repository slices. The backend scopes
// every list to the signed-in tenant (identity comes from the session token).
export const tenantIssues = issuesRepo;
export const tenantComplaints = complaintsRepo;
export const tenantServiceRequests = serviceRequestsRepo;
export const tenantServicesCatalog = servicesRepo;
export const tenantPayments = paymentsRepo;
export const tenantNotifications = notificationsRepo;
export const markTenantNotificationRead = markNotificationRead;
export const markAllTenantNotificationsRead = markAllNotificationsRead;

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

// Tenant-only workflow state (not a repository copy): rent ledger and active stay.
export const tenantReducers = {
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

