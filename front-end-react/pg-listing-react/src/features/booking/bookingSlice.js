import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { http, qs, asArray } from '../../services/apiClient';
import { setSession } from '../auth/authSlice';
import { fetchListings, fetchListingById } from '../listings/listingsSlice';
import { rememberIssuedPassword } from './issuedPassword';

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
export const submitCheckout = createAsyncThunk(
  'booking/submitCheckout',
  async ({ paymentMethod, upiId }, { getState, dispatch, rejectWithValue, requestId }) => {
    const { booking, auth } = getState();
    const user = auth.user;
    const { selectedPG: pg, selectedRoom: room, selectedRoommate, lifestyleProfile, bookingFor, friendDetails } = booking;
    if (!pg || !room) return rejectWithValue('Your booking session has expired. Please choose a room again.');
    if (!user) return rejectWithValue('Please sign in to complete your booking.');

    const totals = selectTotals(getState());
    const forFriend = bookingFor === 'friend';
    const single = isSingleRoom(room);

    const payload = {
      guestId: forFriend ? undefined : user.id,
      name: forFriend ? friendDetails.name.trim() : user.name,
      email: forFriend ? friendDetails.email.trim() : user.email,
      phone: forFriend ? friendDetails.phone.trim() : user.phone || '',
      gender: forFriend ? friendDetails.gender || undefined : user.gender || undefined,
      propertyId: Number(pg.id),
      propertyName: pg.title,
      roomType: room.type,
      roomNumber: single ? room.roomNumber || undefined : selectedRoommate?.roomNum || room.roomNumber || undefined,
      checkIn: booking.moveInDate,
      duration: booking.duration,
      rent: totals.rent,
      deposit: totals.deposit,
      totalAmount: totals.total,
      paymentMethod: paymentMethod.toUpperCase(),
      transactionId: `TXN-${Date.now().toString().slice(-8)}`,
      roommate: single ? undefined : selectedRoommate || undefined,
      lifestyleProfile: single ? undefined : lifestyleProfile || undefined,
      upiId: paymentMethod === 'upi' ? upiId : undefined,
    };

    const isCurrentCheckout = () => getState().booking.checkout.requestId === requestId;
    const ended = () => rejectWithValue('Your booking session ended. Sign in to view your bookings.');
    try {
      const result = await http.post('/bookings/checkout', payload);
      // Availability changed even if the user signed out while checkout was running.
      dispatch(fetchListings());
      if (!isCurrentCheckout()) return ended();
      // Booking for yourself promotes your account to tenant. Booking for a
      // friend creates *their* account, so your session stays as it is.
      if (!forFriend && result?.tenant) {
        dispatch(setSession({ user: { ...user, ...result.tenant, role: 'tenant', status: 'active' } }));
      }
      // Checkout creates the confirmed booking, so drop the unpaid request it replaces.
      if (booking.pendingBookingId) await http.delete(`/bookings/${booking.pendingBookingId}`).catch(() => null);
      if (!isCurrentCheckout()) return ended();
      dispatch(fetchListingById(pg.id));
      const { password, ...credentials } = result.credentials ?? {};
      rememberIssuedPassword(result.booking?.id, password);
      return { ...result, credentials };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

export const fetchMyBookings = createAsyncThunk('booking/fetchMyBookings', async (_, { getState, rejectWithValue }) => {
  const id = getState().auth.user?.id;
  if (!id) return [];
  try {
    // Never show another user's bookings, whatever the server returns.
    return asArray(await http.get(`/bookings${qs({ tenantId: id })}`))
      .filter((b) => Number(b.tenantId ?? b.tenant?.id) === Number(id))
      .sort((a, b) => b.id - a.id);
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const cancelMyBooking = createAsyncThunk('booking/cancelMyBooking', async (id, { rejectWithValue }) => {
  try {
    await http.delete(`/bookings/${id}`);
    return id;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const fetchMyTransactions = createAsyncThunk('booking/fetchMyTransactions', async (_, { getState, rejectWithValue }) => {
  const { id, role } = getState().auth.user || {};
  // Guests have no payments yet (the payments API is for tenants).
  if (!id || role !== 'tenant') return [];
  try {
    return asArray(await http.get(`/payments${qs({ tenantId: id })}`));
  } catch (err) {
    return rejectWithValue(err.message);
  }
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
  pendingBookingId: null,

  matches: { items: [], status: 'idle', error: null },
  profileSaveRequestId: null,
  checkout: { status: 'idle', error: null },
  myBookings: { items: [], status: 'idle', error: null },
  myTransactions: { items: [], status: 'idle', error: null },
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
      return {
        ...createInitialState(),
        lastConfirmed: state.lastConfirmed,
        myBookings: state.myBookings,
        myTransactions: state.myTransactions,
      };
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
      .addCase(submitCheckout.rejected, (state, { payload, meta }) => {
        if (state.checkout.requestId !== meta.requestId) return;
        state.checkout = { status: 'failed', error: payload || 'Payment failed. Please retry.' };
      })
      .addCase(fetchMyBookings.pending, (state, { meta }) => {
        state.myBookings.requestId = meta.requestId;
        state.myBookings.status = 'loading';
        state.myBookings.error = null;
      })
      .addCase(fetchMyBookings.fulfilled, (state, { payload, meta }) => {
        if (state.myBookings.requestId !== meta.requestId) return;
        state.myBookings = { items: payload, status: 'succeeded', error: null };
      })
      .addCase(fetchMyBookings.rejected, (state, { payload, meta }) => {
        if (state.myBookings.requestId !== meta.requestId) return;
        delete state.myBookings.requestId;
        state.myBookings.status = 'failed';
        state.myBookings.error = payload;
      })
      .addCase(cancelMyBooking.fulfilled, (state, { payload: id }) => {
        state.myBookings.items = state.myBookings.items.filter((x) => String(x.id) !== String(id));
      })
      .addCase(fetchMyTransactions.pending, (state, { meta }) => {
        state.myTransactions.requestId = meta.requestId;
        state.myTransactions.status = 'loading';
        state.myTransactions.error = null;
      })
      .addCase(fetchMyTransactions.fulfilled, (state, { payload, meta }) => {
        if (state.myTransactions.requestId !== meta.requestId) return;
        state.myTransactions = { items: payload, status: 'succeeded', error: null };
      })
      .addCase(fetchMyTransactions.rejected, (state, { payload, meta }) => {
        if (state.myTransactions.requestId !== meta.requestId) return;
        delete state.myTransactions.requestId;
        state.myTransactions.status = 'failed';
        state.myTransactions.error = payload;
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
export const selectLastConfirmed = (state) => state.booking.lastConfirmed;
export const selectMyBookings = (state) => state.booking.myBookings;
export const selectMyTransactions = (state) => state.booking.myTransactions;

export const selectTotals = createSelector([selectSelectedRoom], (room) => {
  const rent = Number(room?.rent) || 0;
  const deposit = Number(room?.deposit) || Math.round(rent * 0.4);
  return { rent, deposit, fee: PLATFORM_FEE, total: rent + deposit + PLATFORM_FEE };
});
