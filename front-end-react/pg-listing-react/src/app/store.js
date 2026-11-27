import { configureStore } from '@reduxjs/toolkit';
import rootReducer from './rootReducer';
import { injectStore } from '../services/apiClient';
import { persistTabSession } from '../features/auth/tabSession';
import { setScreenValue } from '../features/ui/screenStateSlice';

const MASK = '***';

// Redux DevTools (development only) never shows a password: secret screen
// fields and the one-time issued booking password are masked.
const stateSanitizer = (state) => {
  if (!state?.screenState) return state;
  const screenState = Object.fromEntries(
    Object.entries(state.screenState).map(([id, entry]) => [id, entry?.secret ? { ...entry, value: MASK } : entry]),
  );
  const booking = state.booking?.issuedPassword
    ? { ...state.booking, issuedPassword: { ...state.booking.issuedPassword, password: MASK } }
    : state.booking;
  return { ...state, screenState, booking };
};
const actionSanitizer = (action) => {
  if (action.type === setScreenValue.type && action.payload?.secret) {
    return { ...action, payload: { ...action.payload, value: MASK } };
  }
  if (action.type === 'booking/submitCheckout/fulfilled' && action.payload?.issuedPassword) {
    return { ...action, payload: { ...action.payload, issuedPassword: MASK } };
  }
  return action;
};

// All application state lives here; thunks keep it in sync with the API. Only
// the login (user + token) is copied to this tab's sessionStorage. Picked
// files are referenced by id (see features/ui/fileRegistry.js).
export const store = configureStore({
  reducer: rootReducer,
  devTools: import.meta.env.DEV ? { stateSanitizer, actionSanitizer } : false,
});

injectStore(store);
persistTabSession(store);
