import { createSelector } from '@reduxjs/toolkit';
import { createResourceSlice } from '../shared/createResourceSlice';
import { api, deriveSubscriptions, subscriptionStats } from '../../dashboards/admin/services/api';

// One resource slice per admin collection. Pages dispatch
// `adminUsers.thunks.fetchAll()` etc. and read with the matching selectors.

export const adminUsers = createResourceSlice({
  name: 'adminUsers',
  api: { list: api.getUsers, create: api.createUser, update: api.updateUser, remove: api.deleteUser },
});

export const adminProperties = createResourceSlice({
  name: 'adminProperties',
  api: { list: api.getProperties, create: api.createProperty, update: api.updateProperty, remove: api.deleteProperty },
});

export const adminBookings = createResourceSlice({
  name: 'adminBookings',
  api: { list: api.getBookings, update: api.updateBooking },
});

export const adminPayments = createResourceSlice({
  name: 'adminPayments',
  api: { list: api.getPayments, update: api.updatePayment },
});

export const adminComplaints = createResourceSlice({
  name: 'adminComplaints',
  api: { list: api.getComplaints, update: api.updateComplaint, remove: api.deleteComplaint },
});

export const adminNotifications = createResourceSlice({
  name: 'adminNotifications',
  api: {
    list: api.getNotifications,
    create: ({ data, byUserId }) => api.createNotification(data, byUserId),
    remove: api.deleteNotification,
  },
});

export const adminReducers = {
  adminUsers: adminUsers.reducer,
  adminProperties: adminProperties.reducer,
  adminBookings: adminBookings.reducer,
  adminPayments: adminPayments.reducer,
  adminComplaints: adminComplaints.reducer,
  adminNotifications: adminNotifications.reducer,
};

// Subscriptions are derived from owner accounts held in adminUsers.
export const selectAdminSubscriptions = createSelector([adminUsers.selectors.selectItems], deriveSubscriptions);
export const selectAdminSubscriptionStats = createSelector([selectAdminSubscriptions], subscriptionStats);
