import { createSlice } from '@reduxjs/toolkit';
import { DEFAULT_SERVICES, SUBSCRIPTION_PLANS } from '../../data/catalog';

// Shared display data for catalogs with no API, including standard PG services.
const catalogSlice = createSlice({
  name: 'catalog',
  initialState: {
    subscriptionPlans: SUBSCRIPTION_PLANS,
    defaultServices: DEFAULT_SERVICES,
  },
  reducers: {},
});

export const selectSubscriptionPlans = (state) => state.catalog.subscriptionPlans;
export const selectDefaultServices = (state) => state.catalog.defaultServices;
export default catalogSlice.reducer;
