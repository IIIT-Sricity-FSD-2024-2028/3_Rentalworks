import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import { http } from '../../services/apiClient';
import { findPlan } from '../../data/catalog';
import { sumMoney } from '../../utils/revenue';
import { selectSubscriptionPlans } from '../shared/catalogSlice';

export const fetchSubscriptionReport = createAsyncThunk(
  'subscriptionReport/fetch',
  async (_, { rejectWithValue }) => {
    try {
      return await http.get('/users/session/subscription-report', { auth: true });
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
  { condition: (_, { getState }) => getState().subscriptionReport.status !== 'loading' },
);

const reportSlice = createSlice({
  name: 'subscriptionReport',
  initialState: { data: null, status: 'idle', error: null, requestId: null },
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchSubscriptionReport.pending, (state, { meta }) => {
      state.requestId = meta.requestId;
      state.status = 'loading';
      state.error = null;
    })
      .addCase(fetchSubscriptionReport.fulfilled, (state, { payload, meta }) => {
        if (state.requestId !== meta.requestId) return;
        state.data = payload;
        state.status = 'ready';
        state.requestId = null;
      })
      .addCase(fetchSubscriptionReport.rejected, (state, { payload, meta, error }) => {
        if (state.requestId !== meta.requestId) return;
        state.status = 'failed';
        state.error = payload || error.message;
        state.requestId = null;
      });
  },
});

export default reportSlice.reducer;
export const selectSubscriptionReport = (state) => state.subscriptionReport;
const selectReportData = (state) => selectSubscriptionReport(state).data;
const EMPTY_ROWS = [];

export const selectSubscriptions = createSelector(
  [selectReportData, selectSubscriptionPlans],
  (data, plans) => {
    if (!data) return EMPTY_ROWS;
    const paymentsById = new Map();
    const latestPaymentBySubscription = new Map();
    for (const payment of data.payments) {
      if (!payment.receiptNumber) continue;
      paymentsById.set(String(payment.id), payment);
      const subscriptionId = String(payment.subscriptionId);
      if (!latestPaymentBySubscription.has(subscriptionId)) latestPaymentBySubscription.set(subscriptionId, payment);
    }
    return data.subscriptions.map((row) => {
      const plan = findPlan(row.planType, plans);
      const payment = latestPaymentBySubscription.get(String(row.id)) || paymentsById.get(String(row.paymentId));
      const receipt = payment && String(payment.ownerId) === String(row.ownerId) ? payment : null;
      return {
        ...row,
        planType: plan?.name || String(row.planType || 'Unknown').toUpperCase(),
        planName: plan?.displayName || row.planType || 'Unknown plan',
        receipt,
      };
    });
  },
);
export const selectSubscriptionSummary = createSelector(
  [selectReportData, selectSubscriptions],
  (data, subscriptions) => {
    const active = subscriptions.filter((row) => row.status === 'ACTIVE');
    const payments = data?.ledgerAvailable ? data.payments.filter((payment) => payment.currency === 'INR') : EMPTY_ROWS;
    const countPlan = (plan) => active.filter((row) => row.planType === plan).length;
    return {
      totalRevenue: data?.ledgerAvailable ? sumMoney(payments, (payment) => payment.amount) : null,
      payments,
      totalActive: active.length,
      monthly: countPlan('MONTHLY'),
      yearly: countPlan('YEARLY'),
      lifetime: countPlan('LIFETIME'),
    };
  },
);

