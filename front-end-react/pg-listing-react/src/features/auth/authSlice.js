import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { http } from '../../services/apiClient';
import { loadSession } from './authStorage';

export const MANAGEMENT_ROLES = ['admin', 'owner', 'warden', 'super_admin'];

/** Where each role lands after signing in. */
export const ROLE_HOME = {
  tenant: '/dashboard/tenant',
  guest: '/listings',
  warden: '/dashboard/warden',
  owner: '/dashboard/owner',
  admin: '/dashboard/admin',
  super_admin: '/dashboard/superadmin',
};

const toError = (err) => err?.message || 'Something went wrong';

// The server matches username / email / phone exactly, and every stored email
// is lowercase. Trim, and lowercase anything that looks like an email, so
// 'Ravi@Mail.com ' signs in the same as 'ravi@mail.com'.
const toIdentifier = (value) => {
  const v = String(value || '').trim();
  return v.includes('@') ? v.toLowerCase() : v;
};

function splitToken(payload) {
  const { token, password: _pw, ...user } = payload || {};
  return { user, token: token || null };
}

// ---------------------------------------------------------------- thunks

export const login = createAsyncThunk('auth/login', async ({ username, password }, { rejectWithValue }) => {
  try {
    const data = await http.post('/users/login', { username: toIdentifier(username), password }, { auth: false });
    if (data?.role === 'owner' && data?.status === 'pending') {
      return rejectWithValue('Your property registration is pending admin verification. You will be notified once approved.');
    }
    return splitToken(data);
  } catch (err) {
    return rejectWithValue(toError(err));
  }
});

export const guestLogin = createAsyncThunk('auth/guestLogin', async ({ username, password }, { rejectWithValue }) => {
  try {
    const data = await http.post('/users/guest-login', { username: toIdentifier(username), password }, { auth: false });
    return splitToken(data);
  } catch (err) {
    return rejectWithValue(toError(err));
  }
});

export const registerGuest = createAsyncThunk('auth/registerGuest', async (details, { rejectWithValue }) => {
  try {
    await http.post('/users/guest-register', details, { auth: false });
    // The register endpoint returns an existing account without checking its
    // password, so the session always comes from a real sign-in.
    const data = await http.post('/users/login', { username: details.email, password: details.password }, { auth: false }).catch((err) => {
      if (err.status === 401) throw new Error('An account with this email or phone already exists. Please sign in instead.');
      throw err;
    });
    return splitToken(data);
  } catch (err) {
    return rejectWithValue(toError(err));
  }
});

/** Owner application: creates a *pending* account, does not sign in. */
export const registerOwner = createAsyncThunk('auth/registerOwner', async (details, { rejectWithValue }) => {
  try {
    return await http.post('/users/owner-register', details, { auth: false });
  } catch (err) {
    return rejectWithValue(toError(err));
  }
});

/** Reload the signed-in user's profile from the server. */
export const refreshProfile = createAsyncThunk('auth/refreshProfile', async (_, { getState, rejectWithValue }) => {
  const id = getState().auth.user?.id;
  if (!id) return rejectWithValue('Not signed in');
  try {
    return await http.get(`/users/${id}`);
  } catch (err) {
    return rejectWithValue(toError(err));
  }
});

/** Update the signed-in user's own profile (PUT /users/:id). */
export const updateMyProfile = createAsyncThunk('auth/updateMyProfile', async (changes, { getState, rejectWithValue }) => {
  const { id, role } = getState().auth.user || {};
  if (!id) return rejectWithValue('Not signed in');
  // The API has no guest profile update; checkout saves these details instead.
  if (role === 'guest') return changes;
  try {
    const updated = await http.put(`/users/${id}`, changes);
    return { ...changes, ...(updated || {}) };
  } catch (err) {
    return rejectWithValue(toError(err));
  }
});

/** Checks the current password by signing in, then saves the new one. */
export const changeMyPassword = createAsyncThunk('auth/changeMyPassword', async ({ currentPassword, newPassword }, { getState, rejectWithValue }) => {
  const user = getState().auth.user;
  if (!user?.id) return rejectWithValue('Not signed in');
  try {
    await http.post('/users/login', { username: user.username || user.email, password: currentPassword }, { auth: false });
  } catch (err) {
    return rejectWithValue(err.status === 401 ? 'Your current password is incorrect' : toError(err));
  }
  try {
    await http.put(`/users/${user.id}`, { password: newPassword });
    return true;
  } catch (err) {
    return rejectWithValue(toError(err));
  }
});

// ---------------------------------------------------------------- slice

const initial = loadSession();

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: initial.user,
    token: initial.token,
    status: 'idle', // idle | loading | succeeded | failed
    error: null,
    profileStatus: 'idle',
    sessionExpired: false,
  },
  reducers: {
    /** Replace the session (e.g. after checkout promotes a guest to tenant). */
    setSession(state, { payload }) {
      const { user, token } = payload || {};
      state.user = user || null;
      if (token !== undefined) state.token = token;
      state.error = null;
      state.sessionExpired = false;
    },
    patchUser(state, { payload }) {
      if (state.user) state.user = { ...state.user, ...payload };
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.status = 'idle';
      state.error = null;
    },
    sessionExpired(state) {
      state.user = null;
      state.token = null;
      state.sessionExpired = true;
    },
    clearAuthError(state) {
      state.error = null;
    },
    /** Sync from another tab's storage event. */
    syncFromStorage(state, { payload }) {
      state.user = payload.user;
      state.token = payload.token;
    },
  },
  extraReducers: (builder) => {
    const pending = (state) => {
      state.status = 'loading';
      state.error = null;
    };
    const signedIn = (state, { payload }) => {
      state.status = 'succeeded';
      state.user = payload.user;
      state.token = payload.token;
      state.sessionExpired = false;
    };
    const failed = (state, { payload, error }) => {
      state.status = 'failed';
      state.error = payload || error?.message || 'Request failed';
    };

    [login, guestLogin, registerGuest].forEach((thunk) => {
      builder.addCase(thunk.pending, pending).addCase(thunk.fulfilled, signedIn).addCase(thunk.rejected, failed);
    });

    builder
      .addCase(registerOwner.pending, pending)
      .addCase(registerOwner.fulfilled, (state) => {
        state.status = 'succeeded';
      })
      .addCase(registerOwner.rejected, failed)
      .addCase(refreshProfile.pending, (state) => {
        state.profileStatus = 'loading';
      })
      .addCase(refreshProfile.fulfilled, (state, { payload }) => {
        state.profileStatus = 'succeeded';
        if (state.user && payload) {
          const { password: _pw, ...rest } = payload;
          state.user = { ...state.user, ...rest };
        }
      })
      .addCase(refreshProfile.rejected, (state) => {
        state.profileStatus = 'failed';
      })
      .addCase(updateMyProfile.fulfilled, (state, { payload }) => {
        if (state.user && payload) {
          const { password: _pw, currentPassword: _cp, ...rest } = payload;
          state.user = { ...state.user, ...rest };
        }
      });
  },
});

export const { setSession, patchUser, logout, sessionExpired, clearAuthError, syncFromStorage } = authSlice.actions;
export default authSlice.reducer;

// ---------------------------------------------------------------- selectors
export const selectAuth = (state) => state.auth;
export const selectCurrentUser = (state) => state.auth.user;
export const selectToken = (state) => state.auth.token;
export const selectIsAuthenticated = (state) => Boolean(state.auth.user?.id);
export const selectUserRole = (state) => state.auth.user?.role || null;
export const selectIsManagement = (state) => MANAGEMENT_ROLES.includes(state.auth.user?.role);
