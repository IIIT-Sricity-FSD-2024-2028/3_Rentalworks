import { createResourceSlice } from '../shared/createResourceSlice';
import { api } from '../../dashboards/admin/services/api';
import propertyDocumentsReducer from './propertyDocumentsSlice';

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
  api: { list: api.getBookings, create: api.createBooking, update: api.updateBooking, remove: api.deleteBooking },
});

export const adminPayments = createResourceSlice({
  name: 'adminPayments',
  api: { list: api.getPayments, create: api.createPayment, update: api.updatePayment, remove: api.deletePayment },
});

export const adminComplaints = createResourceSlice({
  name: 'adminComplaints',
  api: { list: api.getComplaints, create: api.createComplaint, update: api.updateComplaint, remove: api.deleteComplaint },
});

export const adminNotifications = createResourceSlice({
  name: 'adminNotifications',
  api: {
    list: api.getNotifications,
    create: ({ data, byUserId }) => api.createNotification(data, byUserId),
    update: api.updateNotification,
    remove: api.deleteNotification,
  },
});

export const adminReducers = {
  propertyDocuments: propertyDocumentsReducer,
  adminUsers: adminUsers.reducer,
  adminProperties: adminProperties.reducer,
  adminBookings: adminBookings.reducer,
  adminPayments: adminPayments.reducer,
  adminComplaints: adminComplaints.reducer,
  adminNotifications: adminNotifications.reducer,
};
