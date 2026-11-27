import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { http, asArray } from '../../services/apiClient';
import { setSession } from '../auth/authSlice';
import { fetchListings, fetchListingById } from '../listings/listingsSlice';
import { bookingsRepo, paymentsRepo } from '../repositories';
import { payOnline, fetchGatewayConfig } from '../../services/paymentGateway';

export const PLATFORM_FEE = 500;
export const DURATIONS = [
  { value: '1 Month', label: '1 Month (Short Stay)' },
  { value: '3 Months', label: '3 Months (Standard)' },
  { value: '6 Months', label: '6 Months (Recommended)' },
  { value: '11 Months', label: '11 Months (Full Academic/Work Year)' },
];

const defaultMoveIn = () => {
  const d = new Date();
  d.setDate(d.getDate() + 5);
  return d.toISOString().split('T')[0];
};

export const isSingleRoom = (room) => room?.sharing === 'single' || Number(room?.capacity) === 1;

/** Gender policy shared by the details page, roommate step and checkout. */
export function checkGenderEligibility(pg, user) {
  const policy = pg?.gender || 'unisex';
  const g = String(user?.gender || '').toLowerCase();
  if (policy === 'girls') {
    if (!g) return { ok: false, needsGender: true };
    if (!['female', 'f', 'girl'].includes(g)) {
      return { ok: false, message: `"${pg.title}" is a Girls Only accommodation. Male residents are not eligible to book this PG.` };
    }
  }
  if (policy === 'boys') {
    if (!g) return { ok: false, needsGender: true };
    if (!['male', 'm', 'boy'].includes(g)) {
      return { ok: false, message: `"${pg.title}" is a Boys Only accommodation. Female residents are not eligible to book this PG.` };
    }
  }
  return { ok: true };
}

// ------------------------------------------------------------------ thunks

/** Saves the guest's lifestyle profile and asks the server for ranked roommates. */
export const calculateRoommateMatches = createAsyncThunk(
  'booking/calculateRoommateMatches',
  async (profile, { rejectWithValue }) => {
    try {
      await http.post('/roommates/profile', profile, { auth: false }).catch(() => null);
      const data = await http.post('/roommates/calculate-matches', profile, { auth: false });
      return asArray(data)
        .map((item) => ({
          id: item.id,
          name: item.name,
          profession: item.profession || '',
          age: item.age,
          company: item.company || '',
          roomNum: item.roomNumber || '',
          room: item.roomNumber ? `Room ${item.roomNumber}` : 'Room to be assigned',
          sharing: item.roomType || profile.roomType,
          sleepHabit: item.sleepSchedule,
          cleanliness: item.cleanliness,
          foodHabit: item.foodHabit,
          hobbies: Array.isArray(item.interests) ? item.interests : [],
          img: item.avatar || `https://ui-avatars.com/api/?background=ca8a04&color=fff&name=${encodeURIComponent(item.name || 'R')}`,
          matchPercentage: Number(item.matchPercentage || item.compatibility) || 0,
        }))
        .sort((a, b) => b.matchPercentage - a.matchPercentage);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

export const saveLifestyleProfile = createAsyncThunk('booking/saveLifestyleProfile', async (profile) => {
  await http.post('/roommates/profile', profile, { auth: false }).catch(() => null);
  return profile;
});

/**
 * Pays and confirms the booking in one server transaction
 * (user promotion, bed allocation, payment, stay, rent ledger, notifications).
 */
/** Which payment mode the server runs: 'razorpay' (real money) or 'test'. */
export const loadPaymentConfig = createAsyncThunk('booking/loadPaymentConfig', async () => fetchGatewayConfig());

export const submitCheckout = createAsyncThunk(
  'booking/submitCheckout',
  async (_arg, { getState, dispatch, rejectWithValue }) => {
    const { booking, auth } = getState();
    const user = auth.user;
    const { selectedPG: pg, selectedRoom: room, selectedRoommate, lifestyleProfile, bookingFor, friendDetails } = booking;
    if (!pg || !room) return rejectWithValue('Your booking session has expired. Please choose a room again.');
    if (!user) return rejectWithValue('Please sign in to complete your booking.');

    const forFriend = bookingFor === 'friend';
    const single = isSingleRoom(room);
    const roomNumber = single ? room.roomNumber || undefined : selectedRoommate?.roomNum || room.roomNumber || undefined;

    // 1. Pay through the gateway. The server prices the room; this page never sends an amount.
    let proof;
    try {
      proof = await payOnline(
        { purpose: 'checkout', propertyId: Number(pg.id), roomNumber },
        { description: `${pg.title} · Room ${roomNumber || ''}`.trim(), name: user.name, email: user.email, phone: user.phone },
      );
    } catch (err) {
      return rejectWithValue(err.message);
    }

    const payload = {
      guestId: forFriend ? undefined : user.id,
      name: forFriend ? friendDetails.name.trim() : user.name,
      email: forFriend ? friendDetails.email.trim() : user.email,
      phone: forFriend ? friendDetails.phone.trim() : user.phone || '',
      gender: forFriend ? friendDetails.gender || undefined : user.gender || undefined,
      propertyId: Number(pg.id),
      propertyName: pg.title,
      roomType: room.type,
      roomNumber,
      checkIn: booking.moveInDate,
      duration: booking.duration,
      // Required by the DTO; the server replaces them with the room's real price.
      rent: 0,
      totalAmount: 0,
      paymentMethod: proof.mode === 'test' ? 'TEST' : 'ONLINE',
      gatewayOrderId: proof.gatewayOrderId,
      gatewayPaymentId: proof.gatewayPaymentId,
      gatewaySignature: proof.gatewaySignature,
      roommate: single ? undefined : selectedRoommate || undefined,
      lifestyleProfile: single ? undefined : lifestyleProfile || undefined,
    };

    try {
      const result = await http.post('/bookings/checkout', payload);
      // Booking for yourself promotes your account to tenant. Booking for a
      // friend creates *their* account, so your session stays as it is.
      if (!forFriend && result?.tenant) {
        dispatch(setSession({ user: { ...user, ...result.tenant, role: 'tenant', status: 'active' } }));
      }
      // Checkout creates the confirmed booking, so drop the unpaid request it replaces.
      if (booking.pendingBookingId) await http.delete(`/bookings/${booking.pendingBookingId}`).catch(() => null);
      // The server just took a bed: reload availability so every page shows the new counts.
      dispatch(fetchListings());
      dispatch(fetchListingById(pg.id));
      return result;
    } catch (err) {
      // 2. Paid but the booking could not be completed (e.g. the bed was just taken).
      return rejectWithValue(
        proof.mode === 'razorpay'
          ? `${err.message} Your payment (${proof.gatewayPaymentId}) was received; contact support with this ID for a refund or another room.`
          : err.message,
      );
    }
  },
);

// "My bookings" and "my transactions" are the bookings / payments repository
// slices; the server already returns only the signed-in user's own rows.
export const fetchMyBookings = createAsyncThunk('booking/fetchMyBookings', async (_, { getState, dispatch }) => {
  if (!getState().auth.user?.id) return false;
  await dispatch(bookingsRepo.thunks.fetchAll());
  return true;
});

export const cancelMyBooking = createAsyncThunk('booking/cancelMyBooking', async (id, { dispatch, rejectWithValue }) => {
  const result = await dispatch(bookingsRepo.thunks.removeItem(id));
  return result.error ? rejectWithValue(result.payload) : id;
});

export const fetchMyTransactions = createAsyncThunk('booking/fetchMyTransactions', async (_, { getState, dispatch }) => {
  const { id, role } = getState().auth.user || {};
  // Guests have no payments yet (the payments API is for tenants).
  if (!id || role !== 'tenant') return false;
  await dispatch(paymentsRepo.thunks.fetchAll());
  return true;
});

// ------------------------------------------------------------------ slice

const initialState = {
  selectedPG: null,
  selectedRoom: null,
  selectedRoommate: null,
  lifestyleProfile: null,
  moveInDate: defaultMoveIn(),
  duration: '6 Months',
  bookingFor: 'self',
  friendDetails: { name: '', phone: '', email: '', gender: '' },
  paymentMethod: 'upi',
  lastConfirmed: null,
  pendingBookingId: null,

  matches: { items: [], status: 'idle', error: null },
  checkout: { status: 'idle', error: null },
  paymentMode: null, // 'razorpay' | 'test', from the server
};

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    startBooking(state, { payload: { pg, room, pendingBookingId = null } }) {
      state.pendingBookingId = pendingBookingId;
      const roomChanged = state.selectedRoom?.id !== room?.id || state.selectedPG?.id !== pg?.id;
      state.selectedPG = pg;
      state.selectedRoom = room;
      if (roomChanged || isSingleRoom(room)) {
        state.selectedRoommate = null;
        state.matches = { items: [], status: 'idle', error: null };
      }
      state.checkout = { status: 'idle', error: null };
    },
    selectRoommate(state, { payload }) {
      state.selectedRoommate = payload;
    },
    setLifestyleProfile(state, { payload }) {
      state.lifestyleProfile = payload;
    },
    setMoveInDate(state, { payload }) {
      state.moveInDate = payload;
    },
    setDuration(state, { payload }) {
      state.duration = payload;
    },
    setBookingFor(state, { payload }) {
      state.bookingFor = payload;
    },
    setFriendDetails(state, { payload }) {
      state.friendDetails = { ...state.friendDetails, ...payload };
    },
    setPaymentMethod(state, { payload }) {
      state.paymentMethod = payload;
    },
    clearCheckoutError(state) {
      state.checkout.error = null;
    },
    resetBookingFlow(state) {
      return { ...initialState, lastConfirmed: state.lastConfirmed, selectedPG: null, selectedRoom: null, selectedRoommate: null, lifestyleProfile: null, moveInDate: defaultMoveIn() };
    },
    /** Drop the one-time password once the user has seen it. */
    forgetIssuedPassword(state) {
      if (state.lastConfirmed?.credentials) state.lastConfirmed.credentials.password = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(calculateRoommateMatches.pending, (state, { meta }) => {
        state.matches = { items: [], status: 'loading', error: null };
        state.lifestyleProfile = meta.arg;
      })
      .addCase(calculateRoommateMatches.fulfilled, (state, { payload }) => {
        state.matches = { items: payload, status: 'succeeded', error: null };
      })
      .addCase(calculateRoommateMatches.rejected, (state, { payload }) => {
        state.matches = { items: [], status: 'failed', error: payload || 'Could not calculate matches' };
      })
      .addCase(saveLifestyleProfile.pending, (state, { meta }) => {
        state.lifestyleProfile = meta.arg;
      })
      .addCase(submitCheckout.pending, (state) => {
        state.checkout = { status: 'loading', error: null };
      })
      .addCase(submitCheckout.fulfilled, (state, { payload }) => {
        state.checkout = { status: 'succeeded', error: null };
        state.pendingBookingId = null;
        state.lastConfirmed = {
          booking: payload.booking,
          payment: payload.payment,
          tenant: payload.tenant,
          credentials: payload.credentials,
          property: state.selectedPG,
          room: state.selectedRoom,
          roommate: state.selectedRoommate,
          bookingFor: state.bookingFor,
          confirmedAt: new Date().toISOString(),
        };
      })
      .addCase(loadPaymentConfig.fulfilled, (state, { payload }) => {
        state.paymentMode = payload?.mode || 'test';
      })
      .addCase(submitCheckout.rejected, (state, { payload }) => {
        state.checkout = { status: 'failed', error: payload || 'Payment failed. Please retry.' };
      });
  },
});

export const {
  startBooking,
  selectRoommate,
  setLifestyleProfile,
  setMoveInDate,
  setDuration,
  setBookingFor,
  setFriendDetails,
  setPaymentMethod,
  clearCheckoutError,
  resetBookingFlow,
  forgetIssuedPassword,
} = bookingSlice.actions;
export default bookingSlice.reducer;

// ------------------------------------------------------------------ selectors

export const selectBooking = (state) => state.booking;
export const selectSelectedPG = (state) => state.booking.selectedPG;
export const selectSelectedRoom = (state) => state.booking.selectedRoom;
export const selectSelectedRoommate = (state) => state.booking.selectedRoommate;
export const selectMatches = (state) => state.booking.matches;
export const selectCheckout = (state) => state.booking.checkout;
export const selectPaymentMode = (state) => state.booking.paymentMode;
export const selectLastConfirmed = (state) => state.booking.lastConfirmed;
const listView = (slice, me) => ({
  items: slice.items.filter((x) => Number(x.tenantId ?? x.tenant?.id) === Number(me)).sort((a, b) => b.id - a.id),
  status: slice.status,
  error: slice.error,
});
/** The signed-in user's bookings / payments, read from the repository slices. */
export const selectMyBookings = createSelector([(s) => s.bookings, (s) => s.auth.user?.id], listView);
export const selectMyTransactions = createSelector([(s) => s.payments, (s) => s.auth.user?.id], listView);

export const selectTotals = createSelector([selectSelectedRoom], (room) => {
  const rent = Number(room?.rent) || 0;
  const deposit = Number(room?.deposit) || Math.round(rent * 0.4);
  return { rent, deposit, fee: PLATFORM_FEE, total: rent + deposit + PLATFORM_FEE };
});
