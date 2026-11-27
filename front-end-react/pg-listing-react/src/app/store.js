import { configureStore } from '@reduxjs/toolkit';
import rootReducer from './rootReducer';
import { injectStore } from '../services/apiClient';

// All application state lives here, in memory. Nothing is written to
// localStorage or sessionStorage; thunks keep the store in sync with the API.
export const store = configureStore({
  reducer: rootReducer,
  devTools: import.meta.env.DEV,
});

injectStore(store);
