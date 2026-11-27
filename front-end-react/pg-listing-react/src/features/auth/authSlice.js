import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { http } from '../../services/apiClient';

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
const sessionPath = '/users/session';
const sessionOptions = { auth: false, credentials: 'include' };

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
    const data = await http.post(sessionPath, { username: toIdentifier(username), password }, sessionOptions);
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
    const data = await http.post(`${sessionPath}?guestOnly=true`, { username: toIdentifier(username), password }, sessionOptions);
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
    const data = await http.post(sessionPath, { username: toIdentifier(details.email), password: details.password }, sessionOptions).catch((err) => {
      if (err.status === 401) throw new Error('An account with this email or phone already exists. Please sign in instead.');
      throw err;
    });
    return splitToken(data);
  } catch (err) {
    return rejectWithValue(toError(err));
  }
});

export const restoreSession = createAsyncThunk(
  'auth/restoreSession',
  async (_, { rejectWithValue }) => {
    try {
      const user = await http.get(sessionPath, sessionOptions);
      return user?.id ? splitToken(user) : { user: null, token: null };
    } catch (err) {
      return rejectWithValue(toError(err));
    }
  },
  {
    condition: (_, { getState }) => ['idle', 'failed'].includes(getState().auth.sessionStatus),
  },
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await http.delete(sessionPath, sessionOptions);
    } catch (err) {
      return rejectWithValue(toError(err));
    }
  },
  { condition: (_, { getState }) => !getState().auth.signingOut },
);

/** Owner application: creates a *pending* account, does not sign in. */
export const registerOwner = createAsyncThunk('auth/registerOwner', async ({ details, document }, { rejectWithValue }) => {
  try {
    // Send the File directly to the API. Redux keeps the serializable result.
    const form = new FormData();
    form.append('details', JSON.stringify(details));
    form.append('document', document);
    const result = await http.post('/users/owner-register', form, { auth: false });
    return { ...result, applicantName: details.name, propertyName: details.propertyName };
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

// The session token lives only in the Redux store. A page reload restores it
// from the signed, http-only browser-session cookie (restoreSession).
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    status: 'idle', // idle | loading | succeeded | failed
    error: null,
    requestId: null,
    profileStatus: 'idle',
    sessionStatus: 'idle',
    sessionExpired: false,
    signingOut: false,
    ownerApplication: null,
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
    sessionExpired(state) {
      state.user = null;
      state.token = null;
      state.sessionStatus = 'ready';
      state.sessionExpired = true;
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const pending = (state, { meta }) => {
      state.requestId = meta.requestId;
      state.status = 'loading';
      state.error = null;
    };
    const signedIn = (state, { payload, meta }) => {
      if (state.requestId !== meta.requestId) return;
      state.requestId = null;
      state.status = 'succeeded';
      state.user = payload.user;
      state.token = payload.token;
      state.sessionExpired = false;
    };
    const failed = (state, { payload, error, meta }) => {
      if (state.requestId !== meta.requestId) return;
      state.requestId = null;
      state.status = 'failed';
      state.error = payload || error?.message || 'Request failed';
    };

    [login, guestLogin, registerGuest].forEach((thunk) => {
      builder.addCase(thunk.pending, pending).addCase(thunk.fulfilled, signedIn).addCase(thunk.rejected, failed);
    });

    builder
      .addCase(restoreSession.pending, (state) => {
        state.sessionStatus = 'loading';
      })
      .addCase(restoreSession.fulfilled, (state, { payload }) => {
        if (state.sessionStatus !== 'loading') return;
        state.user = payload.user;
        state.token = payload.token;
        state.sessionStatus = 'ready';
      })
      .addCase(restoreSession.rejected, (state) => {
        if (state.sessionStatus === 'loading') state.sessionStatus = 'failed';
      })
      .addCase(logout.pending, (state) => {
        state.signingOut = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.sessionStatus = 'ready';
      })
      .addCase(logout.rejected, (state) => {
        state.signingOut = false;
      })
      .addCase(registerOwner.pending, pending)
      .addCase(registerOwner.fulfilled, (state, { payload, meta }) => {
        if (state.requestId !== meta.requestId) return;
        state.requestId = null;
        state.status = 'succeeded';
        state.ownerApplication = payload;
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

export const { setSession, patchUser, sessionExpired, clearAuthError } = authSlice.actions;
export default authSlice.reducer;

// ---------------------------------------------------------------- selectors
export const selectAuth = (state) => state.auth;
export const selectCurrentUser = (state) => state.auth.user;
export const selectSessionStatus = (state) => state.auth.sessionStatus;
export const selectToken = (state) => state.auth.token;
export const selectIsAuthenticated = (state) => Boolean(state.auth.user?.id);
export const selectUserRole = (state) => state.auth.user?.role || null;
export const selectIsManagement = (state) => MANAGEMENT_ROLES.includes(state.auth.user?.role);
