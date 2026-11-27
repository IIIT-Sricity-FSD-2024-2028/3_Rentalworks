import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../dashboards/superadmin/services/api';
import { patchUser } from '../auth/authSlice';

const fail = (err) => err?.message || 'Request failed';

export const fetchSuperAdminOverview = createAsyncThunk('superAdmin/fetchOverview', async (_, { rejectWithValue }) => {
  try {
    return await api.overview();
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
  initialState: { overview: null, status: 'idle', error: null, profile: null, saving: false },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchSuperAdminOverview.pending, (s) => {
      if (!s.overview) s.status = 'loading';
    })
      .addCase(fetchSuperAdminOverview.fulfilled, (s, { payload }) => {
        s.overview = payload;
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

export const selectSuperAdmin = (s) => s.superAdmin;
export const selectSuperAdminOverview = (s) => s.superAdmin.overview;
export const selectSuperAdminProfile = (s) => s.superAdmin.profile;
