import { configureStore, createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import rootReducer from './rootReducer';
import { injectStore } from '../services/apiClient';
import { logout, sessionExpired } from '../features/auth/authSlice';
import { clearIssuedPassword } from '../features/booking/issuedPassword';

const sessionListener = createListenerMiddleware();
sessionListener.startListening({
  matcher: isAnyOf(logout.fulfilled, sessionExpired),
  effect: clearIssuedPassword,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(sessionListener.middleware),
  devTools: import.meta.env.DEV,
});

injectStore(store);
