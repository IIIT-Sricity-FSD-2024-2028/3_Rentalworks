import { configureStore } from '@reduxjs/toolkit';
import rootReducer from './rootReducer';
import { injectStore } from '../services/apiClient';
import { saveSession, clearLegacySessionKeys, loadSession, SESSION_KEY } from '../features/auth/authStorage';
import { saveDraft } from '../features/booking/bookingSlice';
import { syncFromStorage } from '../features/auth/authSlice';

export const store = configureStore({
  reducer: rootReducer,
  devTools: import.meta.env.DEV,
});

injectStore(store);
clearLegacySessionKeys();

// ---- Persistence: write the session / booking draft only when they change.
let prevAuth = store.getState().auth;
let prevBooking = store.getState().booking;
store.subscribe(() => {
  const { auth, booking } = store.getState();
  if (auth.user !== prevAuth.user || auth.token !== prevAuth.token) {
    saveSession(auth.user, auth.token);
  }
  if (booking !== prevBooking) saveDraft(booking);
  prevAuth = auth;
  prevBooking = booking;
});

// ---- Cross-tab sync: signing in/out in one tab updates every other tab.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== SESSION_KEY && event.key !== null) return;
    const next = loadSession();
    const current = store.getState().auth;
    if (next.user?.id !== current.user?.id || next.token !== current.token) {
      store.dispatch(syncFromStorage(next));
    }
  });
}
