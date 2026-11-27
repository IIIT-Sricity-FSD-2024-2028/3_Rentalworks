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

export const updateSuperAdminProfile = createAsyncThunk('superAdmin/updateProfile', async (details, { dispatch, rejectWithValue }) => {
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
  initialState: { loaded: false, status: 'idle', error: null, profile: null, saving: false },
  reducers: {},
  extraReducers: (b) => {
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
        (a) => /^superAdmin\/(create|update|send|change)/.test(a.type) && a.type.endsWith('/pending'),
        (s) => {
          s.saving = true;
        },
      )
      .addMatcher(
        (a) => /^superAdmin\/(create|update|send|change)/.test(a.type) && (a.type.endsWith('/fulfilled') || a.type.endsWith('/rejected')),
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
