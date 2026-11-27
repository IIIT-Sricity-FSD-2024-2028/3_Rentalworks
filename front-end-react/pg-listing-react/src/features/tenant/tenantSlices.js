import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { http, qs, asArray } from '../../services/apiClient';
import { payOnline } from '../../services/paymentGateway';

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
    // Rent dues plus the service usage billed to each (and charges not billed yet).
    const billing = await http.get('/rent-dues/my');
    return { dues: asArray(billing?.dues), pendingCharges: asArray(billing?.pendingCharges) };
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

/**
 * Pay one rent due online. The server bills rent plus the month's service
 * usage; the gateway (Razorpay, or test mode) collects exactly that total, and
 * the server verifies the payment and that the total still matches what the
 * tenant saw (`expectedAmount`) before marking the due paid.
 */
export const payRentDue = createAsyncThunk(
  'tenantRent/payRentDue',
  async ({ dueId, expectedAmount, description }, { dispatch, getState, requestId, rejectWithValue }) => {
    const user = getState().auth.user || {};
    let proof;
    try {
      proof = await payOnline({ purpose: 'rent', rentDueId: dueId }, { description: description || 'Monthly rent', name: user.name, email: user.email, phone: user.phone });
    } catch (err) {
      return rejectWithValue(err.message);
    }
    try {
      const result = await http.post(`/rent-dues/${dueId}/pay`, {
        method: proof.mode === 'test' ? 'TEST' : 'ONLINE',
        ...(expectedAmount != null ? { expectedAmount: Number(expectedAmount) } : {}),
        gatewayOrderId: proof.gatewayOrderId,
        gatewayPaymentId: proof.gatewayPaymentId,
        gatewaySignature: proof.gatewaySignature,
      });
      // The receipt reads the server-confirmed payment from the payments repository.
      if (result?.payment?.id != null && getState().tenantRent.paymentRequestId === requestId) {
        dispatch(paymentsRepo.actions.upsertItem(result.payment));
      }
      return { dueId, result, transactionId: proof.gatewayPaymentId, mode: proof.mode };
    } catch (err) {
      return rejectWithValue(
        proof.mode === 'razorpay' ? `${err.message} Your payment (${proof.gatewayPaymentId}) was received; contact your warden with this ID.` : err.message,
      );
    }
  },
  { condition: (_, { getState }) => !getState().tenantRent.paying },
);

const tenantRentSlice = createSlice({
  name: 'tenantRent',
  initialState: { dues: [], pendingCharges: [], status: 'idle', error: null, fetchRequestId: null, paying: false, payError: null, paymentRequestId: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchMyRentDues.pending, (s, { meta }) => {
      s.fetchRequestId = meta.requestId;
      s.status = 'loading';
      s.error = null;
    })
      .addCase(fetchMyRentDues.fulfilled, (s, { payload, meta }) => {
        if (s.fetchRequestId !== meta.requestId) return;
        s.fetchRequestId = null;
        s.status = 'succeeded';
        s.dues = payload.dues;
        s.pendingCharges = payload.pendingCharges;
      })
      .addCase(fetchMyRentDues.rejected, (s, { payload, meta }) => {
        if (s.fetchRequestId !== meta.requestId) return;
        s.fetchRequestId = null;
        s.status = 'failed';
        s.error = payload;
      })
      .addCase(payRentDue.pending, (s, { meta }) => {
        s.paying = true;
        s.paymentRequestId = meta.requestId;
        s.payError = null;
      })
      .addCase(payRentDue.fulfilled, (s, { payload, meta }) => {
        if (s.paymentRequestId !== meta.requestId) return;
        s.paying = false;
        s.paymentRequestId = null;
        s.fetchRequestId = null;
        const due = s.dues.find((d) => String(d.id) === String(payload.dueId));
        const updated = payload.result?.due || payload.result;
        if (due && String(updated?.id) === String(due.id)) Object.assign(due, updated);
      })
      .addCase(payRentDue.rejected, (s, { payload, meta }) => {
        if (s.paymentRequestId !== meta.requestId) return;
        s.paying = false;
        s.paymentRequestId = null;
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

