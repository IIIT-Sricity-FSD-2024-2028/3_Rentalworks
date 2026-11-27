import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { usersRepo, propertiesRepo, paymentsRepo, notificationsRepo } from '../repositories';
import { api } from '../../dashboards/superadmin/services/api';
import { patchUser } from '../auth/authSlice';

const fail = (err) => err?.message || 'Request failed';

/**
 * One request for the whole platform (users carry the property ids they are
 * linked to). The rows are stored in the shared repository slices, not here.
 */
export const fetchSuperAdminOverview = createAsyncThunk('superAdmin/fetchOverview', async (_, { dispatch, rejectWithValue }) => {
  try {
    const { users = [], properties = [], payments = [], notifications = [] } = (await api.overview()) || {};
    dispatch(usersRepo.actions.setItems(users));
    dispatch(propertiesRepo.actions.setItems(properties));
    dispatch(paymentsRepo.actions.setItems(payments));
    dispatch(notificationsRepo.actions.setItems(notifications));
    return true;
  } catch (err) {
    return rejectWithValue(fail(err));
  }
});

export const fetchSuperAdminProfile = createAsyncThunk('superAdmin/fetchProfile', async (_, { rejectWithValue }) => {
  try {
    return await api.profile();
  } catch (err) {
    return rejectWithValue(fail(err));
  }
});

/** Mutations re-fetch the overview so every page sees fresh numbers. */
const mutate = (type, call, { refresh = true } = {}) =>
  createAsyncThunk(`superAdmin/${type}`, async (arg, { dispatch, rejectWithValue }) => {
    try {
      const result = await call(arg);
      if (refresh) await dispatch(fetchSuperAdminOverview());
      return result;
    } catch (err) {
      return rejectWithValue(fail(err));
    }
  });

export const createRegionalAdmin = mutate('createRegionalAdmin', (details) => api.createAdmin(details));
export const updateRegionalAdmin = mutate('updateRegionalAdmin', ({ id, changes }) => api.updateAdmin(id, changes));
export const sendAnnouncement = mutate('sendAnnouncement', (details) => api.sendNotification(details));
export const changeSuperAdminPassword = mutate('changePassword', (details) => api.changePassword(details), { refresh: false });

/** Every account with its login ID (the overview leaves usernames out). Passwords are never kept. */
export const fetchSuperAdminAccounts = createAsyncThunk('superAdmin/fetchAccounts', async (_, { rejectWithValue }) => {
  try {
    const rows = await api.accounts();
    return (Array.isArray(rows) ? rows : []).map(({ password: _pw, ...user }) => user);
  } catch (err) {
    return rejectWithValue(fail(err));
  }
});

/** Bookings across every PG, for user details and the attention panel. */
export const fetchSuperAdminBookings = createAsyncThunk('superAdmin/fetchBookings', async (_, { rejectWithValue }) => {
  try {
    const rows = await api.bookings();
    return Array.isArray(rows) ? rows : [];
  } catch (err) {
    return rejectWithValue(fail(err));
  }
});

const mutateAndReload = (type, call) =>
  createAsyncThunk(`superAdmin/${type}`, async (arg, { dispatch, rejectWithValue }) => {
    try {
      const result = await call(arg);
      await Promise.all([dispatch(fetchSuperAdminOverview()), dispatch(fetchSuperAdminAccounts())]);
      return result;
    } catch (err) {
      return rejectWithValue(fail(err));
    }
  });

/** Suspend / activate / edit / reset the password of any non-super-admin account. */
export const updateAccount = mutateAndReload('updateAccount', ({ id, changes }) => api.updateAccount(id, changes));
export const deleteAccount = mutateAndReload('deleteAccount', (id) => api.deleteAccount(id));
/** Change a payment's status (e.g. flag as failed / refunded) or clearance. */
export const updatePaymentRecord = mutate('updatePayment', ({ id, changes }) => api.updatePayment(id, changes));

export const updateSuperAdminProfile =createAsyncThunk('superAdmin/updateProfile', async (details, { dispatch, rejectWithValue }) => {
  try {
    const profile = await api.updateProfile(details);
    dispatch(patchUser(profile || details)); // keep the header name/email in sync
    return profile;
  } catch (err) {
    return rejectWithValue(fail(err));
  }
});

const superAdminSlice = createSlice({
  name: 'superAdmin',
  // Platform data lives in the repository slices; this slice keeps load state and the profile.
  initialState: {
    loaded: false, status: 'idle', error: null, profile: null, saving: false,
    accounts: [], accountsStatus: 'idle', bookings: [], bookingsStatus: 'idle',
  },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchSuperAdminAccounts.pending, (s) => { if (!s.accounts.length) s.accountsStatus = 'loading'; })
      .addCase(fetchSuperAdminAccounts.fulfilled, (s, { payload }) => { s.accounts = payload; s.accountsStatus = 'ready'; })
      .addCase(fetchSuperAdminAccounts.rejected, (s) => { s.accountsStatus = 'failed'; })
      .addCase(fetchSuperAdminBookings.pending, (s) => { if (!s.bookings.length) s.bookingsStatus = 'loading'; })
      .addCase(fetchSuperAdminBookings.fulfilled, (s, { payload }) => { s.bookings = payload; s.bookingsStatus = 'ready'; })
      .addCase(fetchSuperAdminBookings.rejected, (s) => { s.bookingsStatus = 'failed'; });
    b.addCase(fetchSuperAdminOverview.pending, (s) => {
      if (!s.loaded) s.status = 'loading';
    })
      .addCase(fetchSuperAdminOverview.fulfilled, (s) => {
        s.loaded = true;
        s.status = 'succeeded';
        s.error = null;
      })
      .addCase(fetchSuperAdminOverview.rejected, (s, { payload }) => {
        s.status = 'failed';
        s.error = payload;
      })
      .addCase(fetchSuperAdminProfile.fulfilled, (s, { payload }) => {
        s.profile = payload;
      })
      .addCase(updateSuperAdminProfile.fulfilled, (s, { payload }) => {
        s.profile = { ...s.profile, ...payload };
      })
      .addMatcher(
        (a) => /^superAdmin\/(create|update|delete|send|change)/.test(a.type) && a.type.endsWith('/pending'),
        (s) => {
          s.saving = true;
        },
      )
      .addMatcher(
        (a) => /^superAdmin\/(create|update|delete|send|change)/.test(a.type) && (a.type.endsWith('/fulfilled') || a.type.endsWith('/rejected')),
        (s) => {
          s.saving = false;
        },
      );
  },
});

export default superAdminSlice.reducer;

/** The platform overview the super-admin pages render, read from the repository slices. */
export const selectSuperAdminOverview = createSelector(
  [(s) => s.superAdmin.loaded, usersRepo.selectors.selectItems, propertiesRepo.selectors.selectItems, paymentsRepo.selectors.selectItems, notificationsRepo.selectors.selectItems],
  (loaded, users, properties, payments, notifications) => (loaded ? { users, properties, payments, notifications } : null),
);
export const selectSuperAdmin = createSelector([(s) => s.superAdmin, selectSuperAdminOverview], (state, overview) => ({ ...state, overview }));
export const selectSuperAdminProfile = (s) => s.superAdmin.profile;
export const selectSuperAdminBookings = (s) => s.superAdmin.bookings;
export const selectSuperAdminSaving = (s) => s.superAdmin.saving;

/** Overview users (with linked property ids) merged with their login IDs and profile fields. */
export const selectPlatformAccounts = createSelector(
  [usersRepo.selectors.selectItems, (s) => s.superAdmin.accounts],
  (users, accounts) => {
    const byId = new Map(accounts.map((a) => [String(a.id), a]));
    return users.map((u) => ({ ...byId.get(String(u.id)), ...u, username: byId.get(String(u.id))?.username || u.username }));
  },
);
