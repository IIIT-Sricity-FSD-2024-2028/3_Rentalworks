import { createSelector } from '@reduxjs/toolkit';
import { usersRepo, propertiesRepo, bookingsRepo, paymentsRepo, complaintsRepo, notificationsRepo, subscriptionsRepo } from '../repositories';
import { deriveSubscriptions, subscriptionStats } from '../../dashboards/admin/services/api';

// The admin portal reads the shared repository slices directly. These names
// are kept so admin pages read naturally (adminUsers.thunks.fetchAll() …),
// but they are the same slices every other dashboard uses, not copies.
export const adminUsers = usersRepo;
export const adminProperties = propertiesRepo;
export const adminBookings = bookingsRepo;
export const adminPayments = paymentsRepo;
export const adminComplaints = complaintsRepo;
export const adminNotifications = notificationsRepo;
export const adminSubscriptions = subscriptionsRepo;

// One row per owner: owner accounts (users) joined with their subscription rows.
export const selectAdminSubscriptions = createSelector([usersRepo.selectors.selectItems, subscriptionsRepo.selectors.selectItems], deriveSubscriptions);
export const selectAdminSubscriptionStats = createSelector([selectAdminSubscriptions], subscriptionStats);
