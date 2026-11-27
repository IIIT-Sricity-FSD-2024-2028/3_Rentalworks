import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { http, asArray } from '../../services/apiClient';
import { fetchListings, fetchListingById } from '../listings/listingsSlice';
import { mapRoom } from '../listings/listingMappers';
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
      const saved = await http.post('/roommates/profile', profile, { auth: false });
      const data = await http.post('/roommates/calculate-matches', profile, { auth: false });
      const matches = asArray(data)
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
      return { profile: { ...profile, ...saved }, matches };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

export const saveLifestyleProfile = createAsyncThunk('booking/saveLifestyleProfile', async (profile, { rejectWithValue }) => {
  try {
    const saved = await http.post('/roommates/profile', profile, { auth: false });
    return { ...profile, ...saved };
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

/**
 * Pays and confirms the booking in one server transaction
 * (user promotion, bed allocation, payment, stay, rent ledger, notifications).
 */
/** Which payment mode the server runs: 'razorpay' (real money) or 'test'. */
export const loadPaymentConfig = createAsyncThunk('booking/loadPaymentConfig', async () => fetchGatewayConfig());

export const submitCheckout = createAsyncThunk(
  'booking/submitCheckout',
  async (_arg, { getState, dispatch, rejectWithValue, requestId }) => {
    const { booking, auth } = getState();
    const user = auth.user;
    const { selectedPG: pg, selectedRoom: room, selectedRoommate, lifestyleProfile, bookingFor, friendDetails } = booking;
    if (!pg || !room) return rejectWithValue('Your booking session has expired. Please choose a room again.');
    if (!user) return rejectWithValue('Please sign in to complete your booking.');

    const forFriend = bookingFor === 'friend';
    const single = isSingleRoom(room);
    // Join the chosen roommate's room only when it is in this PG and still has a
    // free bed; otherwise book the room the guest picked.
    const roommateRoom = !single && selectedRoommate?.roomNum
      ? getState().rooms.items
        .map(mapRoom)
        .find((r) => String(r.propertyId) === String(pg.id) && String(r.roomNumber) === String(selectedRoommate.roomNum) && r.available)
      : null;
    const roomNumber = roommateRoom?.roomNumber || room.roomNumber || undefined;
    if (!roomNumber) return rejectWithValue('Please go back and choose a room to book.');

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
      // Per-booking tenant accounts have no login email; they book as their guest.
      email: forFriend ? friendDetails.email.trim() : user.email || user.preferences?.contactEmail,
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

    const isCurrentCheckout = () => getState().booking.checkout.requestId === requestId;
    const ended = () => rejectWithValue('Your booking session ended. Sign in to view your bookings.');
    try {
      const result = await http.post('/bookings/checkout', payload);
      // Availability changed even if the user signed out while checkout was running.
      dispatch(fetchListings());
      if (!isCurrentCheckout()) return ended();
      // The booking gets its own tenant account (new Tenant ID). The signed-in
      // guest session stays a guest; the tenant dashboard is reached only by
      // signing in with that Tenant ID.
      // Checkout creates the confirmed booking, so drop the unpaid request it replaces.
      if (booking.pendingBookingId) await http.delete(`/bookings/${booking.pendingBookingId}`).catch(() => null);
      if (!isCurrentCheckout()) return ended();
      dispatch(fetchListingById(pg.id));
      // The one-time password is kept apart from the receipt credentials; it is
      // masked in Redux DevTools and cleared on sign-out (root reset).
      const { password, ...credentials } = result.credentials ?? {};
      return { ...result, credentials, issuedPassword: password || null };
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

const createInitialState = () => ({
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
  // { bookingId, password } shown once on the confirmation page.
  issuedPassword: null,
  pendingBookingId: null,

  matches: { items: [], status: 'idle', error: null },
  profileSaveRequestId: null,
  checkout: { status: 'idle', error: null },
  paymentMode: null, // 'razorpay' | 'test', from the server
});

const bookingSlice = createSlice({
  name: 'booking',
  initialState: createInitialState,
  reducers: {
    startBooking(state, { payload: { pg, room, pendingBookingId = null } }) {
      state.pendingBookingId = pendingBookingId;
      const roomChanged = state.selectedRoom?.id !== room?.id || state.selectedPG?.id !== pg?.id;
      state.selectedPG = pg;
      state.selectedRoom = room;
      if (roomChanged || isSingleRoom(room)) {
        state.selectedRoommate = null;
        state.matches = { items: [], status: 'idle', error: null };
        state.profileSaveRequestId = null;
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
      return { ...createInitialState(), lastConfirmed: state.lastConfirmed, issuedPassword: state.issuedPassword, paymentMode: state.paymentMode };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(calculateRoommateMatches.pending, (state, { meta }) => {
        state.matches = { items: [], status: 'loading', error: null, requestId: meta.requestId };
      })
      .addCase(calculateRoommateMatches.fulfilled, (state, { payload, meta }) => {
        if (state.matches.requestId !== meta.requestId) return;
        state.lifestyleProfile = payload.profile;
        state.matches = { items: payload.matches, status: 'succeeded', error: null };
      })
      .addCase(calculateRoommateMatches.rejected, (state, { payload, meta }) => {
        if (state.matches.requestId !== meta.requestId) return;
        state.matches = { items: [], status: 'failed', error: payload || 'Could not calculate matches' };
      })
      .addCase(saveLifestyleProfile.pending, (state, { meta }) => {
        state.profileSaveRequestId = meta.requestId;
      })
      .addCase(saveLifestyleProfile.fulfilled, (state, { payload, meta }) => {
        // Only server-confirmed preferences go into the active booking draft.
        if (state.profileSaveRequestId !== meta.requestId) return;
        state.profileSaveRequestId = null;
        state.lifestyleProfile = payload;
      })
      .addCase(saveLifestyleProfile.rejected, (state, { meta }) => {
        if (state.profileSaveRequestId === meta.requestId) state.profileSaveRequestId = null;
      })
      .addCase(submitCheckout.pending, (state, { meta }) => {
        state.checkout = { status: 'loading', error: null, requestId: meta.requestId };
      })
      .addCase(submitCheckout.fulfilled, (state, { payload, meta }) => {
        if (state.checkout.requestId !== meta.requestId) return;
        state.checkout = { status: 'succeeded', error: null };
        state.pendingBookingId = null;
        state.issuedPassword = payload.issuedPassword ? { bookingId: payload.booking?.id, password: payload.issuedPassword } : null;
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
      .addCase(submitCheckout.rejected, (state, { payload, meta }) => {
        if (state.checkout.requestId !== meta.requestId) return;
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
/** The password issued with this booking, or null (shown once on the receipt page). */
export const selectIssuedPassword = (state, bookingId) => {
  const issued = state.booking.issuedPassword;
  return issued && bookingId != null && String(issued.bookingId) === String(bookingId) ? issued.password : null;
};
const listView = (slice, me) => ({
  items: slice.items.filter((x) => Number(x.tenantId ?? x.tenant?.id) === Number(me)).sort((a, b) => b.id - a.id),
  status: slice.status,
  error: slice.error,
});
/** The signed-in user's bookings / payments, read from the repository slices. */
// The server already scopes GET /bookings to the signed-in user. A guest also
// receives the bookings held by their per-booking Tenant IDs (different user
// ids), so the list is not filtered by the guest's own id here.
export const selectMyBookings = createSelector([(s) => s.bookings], (slice) => ({
  items: [...slice.items].sort((a, b) => b.id - a.id),
  status: slice.status,
  error: slice.error,
}));
export const selectMyTransactions = createSelector([(s) => s.payments, (s) => s.auth.user?.id], listView);

export const selectTotals = createSelector([selectSelectedRoom], (room) => {
  const rent = Number(room?.rent) || 0;
  const deposit = Number(room?.deposit) || Math.round(rent * 0.4);
  return { rent, deposit, fee: PLATFORM_FEE, total: rent + deposit + PLATFORM_FEE };
});
