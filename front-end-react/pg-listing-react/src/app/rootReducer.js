import { combineReducers } from '@reduxjs/toolkit';

import authReducer from '../features/auth/authSlice';
import uiReducer from '../features/ui/uiSlice';
import listingsReducer from '../features/listings/listingsSlice';
import bookingReducer from '../features/booking/bookingSlice';
import { repositoryReducers } from '../features/repositories';
import { tenantReducers } from '../features/tenant/tenantSlices';
import { wardenReducers } from '../features/warden/wardenSlices';
import { ownerReducers } from '../features/owner/ownerSlices';
import superAdminReducer from '../features/superadmin/superAdminSlice';

const appReducer = combineReducers({
  // core
  auth: authReducer,
  ui: uiReducer,
  listings: listingsReducer,
  booking: bookingReducer,
  // one slice per backend repository (19 × 4 CRUD thunks)
  ...repositoryReducers,
  // dashboard-only workflow state
  ...tenantReducers,
  ...wardenReducers,
  ...ownerReducers,
  superAdmin: superAdminReducer,
});

// Signing out wipes every user-specific slice; the public catalogue and
// toasts are kept so the landing page renders instantly.
const RESET_ACTIONS = ['auth/logout', 'auth/sessionExpired'];

export default function rootReducer(state, action) {
  if (state && RESET_ACTIONS.includes(action.type)) {
    const { listings, ui } = state;
    return appReducer({ listings, ui }, action);
  }
  return appReducer(state, action);
}
