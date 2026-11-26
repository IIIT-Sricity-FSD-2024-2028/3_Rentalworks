import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { http, qs, asArray } from '../../services/apiClient';
import { setSession } from '../auth/authSlice';
<<<<<<< HEAD
=======
import { fetchListings, fetchListingById } from '../listings/listingsSlice';
>>>>>>> redux-migration

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

// The in-progress booking survives a refresh within the tab (sessionStorage).
const DRAFT_KEY = 'rentbro_booking_draft';
const DRAFT_FIELDS = ['selectedPG', 'selectedRoom', 'selectedRoommate', 'lifestyleProfile', 'moveInDate', 'duration', 'bookingFor', 'friendDetails', 'paymentMethod', 'lastConfirmed', 'pendingBookingId'];

function loadDraft() {
  try {
    return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

export function saveDraft(bookingState) {
  try {
    const draft = {};
    DRAFT_FIELDS.forEach((k) => {
      draft[k] = bookingState[k];
    });
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // ignore
  }
}

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
export const submitCheckout = createAsyncThunk(
  'booking/submitCheckout',
  async ({ paymentMethod, upiId }, { getState, dispatch, rejectWithValue }) => {
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

    try {
      const result = await http.post('/bookings/checkout', payload);
      // Booking for yourself promotes your account to tenant. Booking for a
      // friend creates *their* account, so your session stays as it is.
      if (!forFriend && result?.tenant) {
        dispatch(setSession({ user: { ...user, ...result.tenant, role: 'tenant', status: 'active' } }));
      }
      // Checkout creates the confirmed booking, so drop the unpaid request it replaces.
      if (booking.pendingBookingId) await http.delete(`/bookings/${booking.pendingBookingId}`).catch(() => null);
<<<<<<< HEAD
=======
      // The server just took a bed: reload availability so every page shows the new counts.
      dispatch(fetchListings());
      dispatch(fetchListingById(pg.id));
>>>>>>> redux-migration
      return result;
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

const draft = loadDraft();

const initialState = {
  selectedPG: draft.selectedPG || null,
  selectedRoom: draft.selectedRoom || null,
  selectedRoommate: draft.selectedRoommate || null,
  lifestyleProfile: draft.lifestyleProfile || null,
  moveInDate: draft.moveInDate || defaultMoveIn(),
  duration: draft.duration || '6 Months',
  bookingFor: draft.bookingFor || 'self',
  friendDetails: draft.friendDetails || { name: '', phone: '', email: '', gender: '' },
  paymentMethod: draft.paymentMethod || 'upi',
  lastConfirmed: draft.lastConfirmed || null,
  pendingBookingId: draft.pendingBookingId || null,

  matches: { items: [], status: 'idle', error: null },
  checkout: { status: 'idle', error: null },
  myBookings: { items: [], status: 'idle', error: null },
  myTransactions: { items: [], status: 'idle', error: null },
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
      return { ...initialState, lastConfirmed: state.lastConfirmed, myBookings: state.myBookings, myTransactions: state.myTransactions, selectedPG: null, selectedRoom: null, selectedRoommate: null, lifestyleProfile: null, moveInDate: defaultMoveIn() };
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
      .addCase(submitCheckout.rejected, (state, { payload }) => {
        state.checkout = { status: 'failed', error: payload || 'Payment failed. Please retry.' };
      })
      .addCase(fetchMyBookings.pending, (state) => {
        state.myBookings.status = 'loading';
        state.myBookings.error = null;
      })
      .addCase(fetchMyBookings.fulfilled, (state, { payload }) => {
        state.myBookings = { items: payload, status: 'succeeded', error: null };
      })
      .addCase(fetchMyBookings.rejected, (state, { payload }) => {
        state.myBookings.status = 'failed';
        state.myBookings.error = payload;
      })
      .addCase(cancelMyBooking.fulfilled, (state, { payload: id }) => {
        state.myBookings.items = state.myBookings.items.filter((x) => String(x.id) !== String(id));
      })
      .addCase(fetchMyTransactions.pending, (state) => {
        state.myTransactions.status = 'loading';
        state.myTransactions.error = null;
      })
      .addCase(fetchMyTransactions.fulfilled, (state, { payload }) => {
        state.myTransactions = { items: payload, status: 'succeeded', error: null };
      })
      .addCase(fetchMyTransactions.rejected, (state, { payload }) => {
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
export const selectLastConfirmed = (state) => state.booking.lastConfirmed;
export const selectMyBookings = (state) => state.booking.myBookings;
export const selectMyTransactions = (state) => state.booking.myTransactions;

export const selectTotals = createSelector([selectSelectedRoom], (room) => {
  const rent = Number(room?.rent) || 0;
  const deposit = Number(room?.deposit) || Math.round(rent * 0.4);
  return { rent, deposit, fee: PLATFORM_FEE, total: rent + deposit + PLATFORM_FEE };
});
