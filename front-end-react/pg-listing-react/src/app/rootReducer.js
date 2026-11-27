import { combineReducers } from '@reduxjs/toolkit';

import authReducer, { logout, sessionExpired } from '../features/auth/authSlice';
import uiReducer from '../features/ui/uiSlice';
import screenStateReducer from '../features/ui/screenStateSlice';
import listingsReducer from '../features/listings/listingsSlice';
import bookingReducer from '../features/booking/bookingSlice';
import { repositoryReducers } from '../features/repositories';
import catalogReducer from '../features/shared/catalogSlice';
import subscriptionReportReducer from '../features/subscriptions/subscriptionReportSlice';
import propertyDetailsDocumentsReducer from '../features/admin/propertyDocumentsSlice';
import { tenantReducers } from '../features/tenant/tenantSlices';
import { wardenReducers } from '../features/warden/wardenSlices';
import { ownerReducers } from '../features/owner/ownerSlices';
import superAdminReducer from '../features/superadmin/superAdminSlice';

const appReducer = combineReducers({
  // core
  auth: authReducer,
  ui: uiReducer,
  screenState: screenStateReducer,
  listings: listingsReducer,
  booking: bookingReducer,
  // one slice per backend repository (19 × 4 CRUD thunks)
  ...repositoryReducers,
  // read-only catalogues and reports
  catalog: catalogReducer,
  subscriptionReport: subscriptionReportReducer,
  propertyDetailsDocuments: propertyDetailsDocumentsReducer,
  // dashboard-only workflow state
  ...tenantReducers,
  ...wardenReducers,
  ...ownerReducers,
  superAdmin: superAdminReducer,
});

// Signing out wipes every user-specific slice; the public catalogue and
// toasts are kept so the landing page renders instantly.
export default function rootReducer(state, action) {
  if (state && (logout.fulfilled.match(action) || sessionExpired.match(action))) {
    const { listings, ui } = state;
    return appReducer({ listings, ui }, action);
  }
  return appReducer(state, action);
}
