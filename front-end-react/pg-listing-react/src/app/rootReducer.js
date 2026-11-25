import { combineReducers } from '@reduxjs/toolkit';

import authReducer from '../features/auth/authSlice';
import uiReducer from '../features/ui/uiSlice';
import listingsReducer from '../features/listings/listingsSlice';
import bookingReducer from '../features/booking/bookingSlice';
import { tenantReducers } from '../features/tenant/tenantSlices';
import { wardenReducers } from '../features/warden/wardenSlices';
import { adminReducers } from '../features/admin/adminSlices';
import { ownerReducers } from '../features/owner/ownerSlices';
import superAdminReducer from '../features/superadmin/superAdminSlice';

const appReducer = combineReducers({
  // core
  auth: authReducer,
  ui: uiReducer,
  listings: listingsReducer,
  booking: bookingReducer,
  // dashboards
  ...tenantReducers,
  ...wardenReducers,
  ...adminReducers,
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
  if (state && action.type === 'auth/syncFromStorage' && action.payload?.user?.id !== state.auth.user?.id) {
    const { listings, ui } = state;
    return appReducer({ listings, ui }, action);
  }
  return appReducer(state, action);
}
