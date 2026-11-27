// =====================================================================
//  Repository slices: one Redux slice per backend repository (table).
//  19 repositories × 4 CRUD thunks (fetchAll, createItem, updateItem,
//  removeItem) = 76 CRUD operations, all synchronised with the API.
//
//  Every dashboard reads repository data from these slices only; there are
//  no per-dashboard copies of the same table.
//
//  Not exposed as slices: `owners` (an unused legacy copy of users with
//  role 'owner') and `notification_receipts` (an internal join table the
//  owner notifications endpoint manages).
// =====================================================================
import { usersRepo } from './usersSlice';
import { propertiesRepo } from './propertiesSlice';
import { roomsRepo } from './roomsSlice';
import { bookingsRepo } from './bookingsSlice';
import { bookingRequestsRepo } from './bookingRequestsSlice';
import { tenantStaysRepo } from './tenantStaysSlice';
import { paymentsRepo } from './paymentsSlice';
import { rentDuesRepo } from './rentDuesSlice';
import { complaintsRepo } from './complaintsSlice';
import { issuesRepo } from './issuesSlice';
import { serviceRequestsRepo } from './serviceRequestsSlice';
import { servicesRepo } from './servicesSlice';
import { ruleViolationsRepo } from './ruleViolationsSlice';
import { notificationsRepo } from './notificationsSlice';
import { wardenNotificationsRepo } from './wardenNotificationsSlice';
import { roommateProfilesRepo } from './roommateProfilesSlice';
import { auditLogsRepo } from './auditLogsSlice';
import { subscriptionsRepo } from './subscriptionsSlice';
import { propertyDocumentsRepo } from './propertyDocumentsSlice';

export {
  usersRepo,
  propertiesRepo,
  roomsRepo,
  bookingsRepo,
  bookingRequestsRepo,
  tenantStaysRepo,
  paymentsRepo,
  rentDuesRepo,
  complaintsRepo,
  issuesRepo,
  serviceRequestsRepo,
  servicesRepo,
  ruleViolationsRepo,
  notificationsRepo,
  wardenNotificationsRepo,
  roommateProfilesRepo,
  auditLogsRepo,
  subscriptionsRepo,
  propertyDocumentsRepo,
};

export const REPOSITORIES = [
  usersRepo,
  propertiesRepo,
  roomsRepo,
  bookingsRepo,
  bookingRequestsRepo,
  tenantStaysRepo,
  paymentsRepo,
  rentDuesRepo,
  complaintsRepo,
  issuesRepo,
  serviceRequestsRepo,
  servicesRepo,
  ruleViolationsRepo,
  notificationsRepo,
  wardenNotificationsRepo,
  roommateProfilesRepo,
  auditLogsRepo,
  subscriptionsRepo,
  propertyDocumentsRepo,
];

/** Store keys = slice names, so each repository's selectors find their state. */
export const repositoryReducers = Object.fromEntries(REPOSITORIES.map((r) => [r.slice.name, r.reducer]));
