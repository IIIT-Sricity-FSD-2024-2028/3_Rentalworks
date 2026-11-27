import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { http } from '../../services/apiClient';
import { showToast } from '../ui/uiSlice';
import { payOnline } from '../../services/paymentGateway';
import { subscriptionsRepo, propertiesRepo, issuesRepo, notificationsRepo, rentDuesRepo, roomsRepo, propertyDocumentsRepo, tenantStaysRepo, bookingRequestsRepo } from '../repositories';
import { REQUIRED_DOCUMENTS } from '../repositories/propertyDocumentsSlice';
import { uploadPropertyPhoto } from '../repositories/propertiesSlice';
import { markNotificationRead, markAllNotificationsRead, clearNotifications } from '../repositories/notificationsSlice';
import { mapProperty, mapRoom } from '../listings/listingMappers';
import { normalizeStatus, statusLabel, toNumber, toISODate, cityFromLocation } from '../../utils/normalize';

// =====================================================================
//  Owner portal
//  - properties / issues / notifications: shared repository slices
//    (features/repositories), called through the owner-scoped /api controller.
//  - ownerAccount: the owner's own settings (policy, profile, plan summary),
//    which are not repository tables.
//  Pages only ever read through the selectors at the bottom of this file.
// =====================================================================

// ------------------------------------------------------------------ mappers

/**
 * Owner card = the public listing card + the raw fields the Edit form needs.
 * Photo, location, price, rooms / beds, gender and amenities all come from
 * mapProperty (features/listings/listingMappers), the same function the
 * landing and listing pages use, so the owner sees exactly what tenants see.
 */
export const mapOwnerProperty = (p) => {
  const listing = mapProperty(p);
  return {
    id: p.id,
    name: listing.title,
    // As shown publicly
    image: listing.image,
    hasPhotos: listing.hasPhotos,
    location: listing.location,
    price: listing.price,
    rentMax: listing.rentMax,
    hasRooms: listing.hasRooms,
    roomCount: listing.roomCount,
    totalBeds: listing.totalBeds,
    occupiedBeds: listing.occupiedBeds,
    freeBeds: listing.freeBeds,
    availabilityText: listing.availabilityText,
    gender: listing.gender,
    amenities: listing.amenityLabels,
    // Rent due from beds that are taken (0 until rooms are added).
    monthlyIncome: listing.rooms.reduce((n, r) => n + r.currentOccupancy * r.rent, 0),
    status: normalizeStatus(p.status) === 'approved' ? 'Active' : statusLabel(p.status, 'Pending'),
    docsVerified: Boolean(p.docsVerified),
    inspectionPassed: Boolean(p.inspectionPassed),
    addedDate: toISODate(p.createdAt),
    // Photos: stored paths are sent back on save; display URLs are for <img>.
    rawImages: Array.isArray(p.images) ? p.images : [],
    photoUrls: listing.images,
    rentBySharing: listing.rentBySharing,
    // Raw values the owner typed, used to pre-fill the Edit form. Older
    // listings have no sharingRents yet: start from what their rooms charge.
    sharingRents: p.sharingRents || listing.rentBySharing,
    description: p.description || '',
    address: p.address || '',
    city: p.city || listing.city || cityFromLocation(p.location),
    state: p.state || '',
    pincode: p.pincode || '',
    // Older listings saved only a gender; read the type from it so saving never turns a girls PG into mixed.
    type: p.type || (listing.gender === 'girls' ? 'Female' : listing.gender === 'boys' ? 'Male' : 'Mixed'),
    totalRooms: p.totalRooms ?? 0,
    totalCapacity: p.totalCapacity ?? 0,
    occupiedRooms: p.occupiedRooms ?? 0,
    monthlyRent: toNumber(p.monthlyRent) || toNumber(p.rentMin),
  };
};

const ISSUE_STATUS = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed' };

export const mapOwnerIssue = (i) => ({
  id: i.id,
  propertyId: i.propertyId,
  propertyName: i.property ? i.property.name : i.propertyName || '',
  title: i.title || i.description || 'Issue reported',
  description: i.description || '',
  category: i.category || 'Maintenance',
  priority: i.priority ? i.priority.charAt(0).toUpperCase() + i.priority.slice(1) : 'Medium',
  status: ISSUE_STATUS[normalizeStatus(i.status)] || statusLabel(i.status, 'Open'),
  reportedBy: i.reportedBy || (i.tenant ? i.tenant.name : 'Tenant'),
  reportedDate: toISODate(i.reportedAt || i.createdAt),
});

export const mapOwnerNotification = (n) => ({
  id: n.id,
  title: n.title,
  message: n.message,
  type: n.type || 'reminder',
  read: Boolean(n.read || n.isRead),
  date: toISODate(n.sentAt || n.createdAt),
});

// ------------------------------------------------------------------ account (policy / profile / plan)

export const fetchOwnerAccount = createAsyncThunk('ownerAccount/fetch', async (_, { rejectWithValue }) => {
  try {
    const [policy, profile, subscription] = await Promise.all([
      http.get('/api/policies'),
      http.get('/api/profile'),
      http.get('/api/subscription').catch(() => null),
    ]);
    return { policy: policy || {}, profile: profile || {}, subscription: subscription || null };
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

/** Load everything the owner portal shows into the store. */
export const loadOwnerData = createAsyncThunk('ownerAccount/loadAll', async (_, { dispatch, rejectWithValue }) => {
  const [results] = await Promise.all([
    Promise.all([
      dispatch(propertiesRepo.thunks.fetchAll()),
      dispatch(issuesRepo.thunks.fetchAll()),
      dispatch(notificationsRepo.thunks.fetchAll()),
      dispatch(fetchOwnerAccount()),
    ]),
    // Secondary data: loaded in the same round, but a failure here does not
    // block the portal (each slice keeps its own error).
    Promise.all([
      dispatch(rentDuesRepo.thunks.fetchAll()),
      dispatch(roomsRepo.thunks.fetchAll()),
      dispatch(propertyDocumentsRepo.thunks.fetchAll()),
      dispatch(tenantStaysRepo.thunks.fetchAll()),
      dispatch(bookingRequestsRepo.thunks.fetchAll()),
    ]),
  ]);
  const failed = results.find((r) => r.error);
  if (failed) return rejectWithValue(failed.payload || 'Could not load the owner portal');
  return true;
});

/**
 * Run a store thunk, then toast. Resolves to the thunk's result action, so
 * callers can check `.error`. `after` lets a mutation refresh data the server
 * recomputes (e.g. property occupancy).
 */
const withToast = (type, makeAction, successMessage, after) =>
  createAsyncThunk(`ownerAccount/${type}`, async (arg, { dispatch, rejectWithValue }) => {
    const result = await dispatch(makeAction(arg));
    if (result.error) {
      const message = result.payload || result.error.message || 'Operation failed';
      dispatch(showToast({ message, type: 'error' }));
      return rejectWithValue(message);
    }
    if (after) await dispatch(after());
    dispatch(showToast({ message: successMessage, type: 'success' }));
    return true;
  });

const plainCall = (name, call) =>
  createAsyncThunk(`ownerAccount/${name}Call`, async (arg, { rejectWithValue }) => {
    try {
      return await call(arg);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  });

const refetchProperties = () => propertiesRepo.thunks.fetchAll();

/**
 * Add Property: create the listing, then upload each verification document.
 * Resolves to { propertyId, failed: [docType…] }. A property whose uploads
 * fail still exists (pending) and the owner can upload from Properties.
 */
export const submitOwnerProperty = createAsyncThunk('ownerAccount/submitProperty', async ({ property, documents, photos = [] }, { dispatch, rejectWithValue }) => {
  const created = await dispatch(propertiesRepo.thunks.createItem(property));
  if (created.error) {
    const message = created.payload || 'Could not create the property';
    dispatch(showToast({ message, type: 'error' }));
    return rejectWithValue(message);
  }
  const propertyId = created.payload?.id;
  const failed = [];
  // Photos first: an admin cannot approve a listing without one.
  for (const file of photos) {
    const up = await dispatch(uploadPropertyPhoto({ propertyId, file }));
    if (up.error) failed.push(`photo ${file.name}`);
  }
  for (const [docType, file] of Object.entries(documents || {})) {
    if (!file) continue;
    const up = await dispatch(propertyDocumentsRepo.thunks.createItem({ propertyId, docType, file }));
    if (up.error) failed.push(docType);
  }
  await Promise.all([dispatch(propertiesRepo.thunks.fetchAll()), dispatch(propertyDocumentsRepo.thunks.fetchAll())]);
  dispatch(
    showToast(
      failed.length
        ? { message: `Property saved, but ${failed.length} file(s) failed to upload (${failed.join(', ')}). Add them from Properties → View.`, type: 'warning' }
        : { message: 'Property, photos and documents submitted for admin review', type: 'success' },
    ),
  );
  return { propertyId, failed };
});

const refetchDocuments = () => propertyDocumentsRepo.thunks.fetchAll();

/** Add photos to an existing listing (Properties → View). */
export const addOwnerPhotos = createAsyncThunk('ownerAccount/addPhotos', async ({ propertyId, files }, { dispatch, rejectWithValue }) => {
  const failed = [];
  for (const file of files) {
    const up = await dispatch(uploadPropertyPhoto({ propertyId, file }));
    if (up.error) failed.push(`${file.name}: ${up.payload}`);
  }
  await dispatch(propertiesRepo.thunks.fetchAll());
  if (failed.length) {
    dispatch(showToast({ message: `Some photos failed: ${failed.join('; ')}`, type: 'error' }));
    return rejectWithValue(failed.join('; '));
  }
  dispatch(showToast({ message: files.length > 1 ? `${files.length} photos added` : 'Photo added', type: 'success' }));
  return true;
});

/** Remove one photo; the listing must keep at least one. */
export const removeOwnerPhoto = withToast(
  'removePhoto',
  ({ property, path }) => propertiesRepo.thunks.updateItem({ id: property.id, changes: { ...property, rawImages: property.rawImages.filter((x) => x !== path) } }),
  'Photo removed',
  refetchProperties,
);
export const uploadOwnerDocument = withToast('uploadDocument', (d) => propertyDocumentsRepo.thunks.createItem(d), 'Document uploaded for review', refetchDocuments);
export const deleteOwnerDocument = withToast('deleteDocument', (id) => propertyDocumentsRepo.thunks.removeItem(id), 'Document removed', refetchDocuments);

// Rooms change occupancy and prices on the property cards, so refetch properties too.
const refetchRoomsAndProperties = () => async (dispatch) => {
  await Promise.all([dispatch(roomsRepo.thunks.fetchAll()), dispatch(propertiesRepo.thunks.fetchAll())]);
};
export const addOwnerRoom = withToast('addRoom', (r) => roomsRepo.thunks.createItem(r), 'Room added', refetchRoomsAndProperties);
export const updateOwnerRoom = withToast('updateRoom', (r) => roomsRepo.thunks.updateItem({ id: r.id, changes: r }), 'Room updated', refetchRoomsAndProperties);
export const deleteOwnerRoom = withToast('deleteRoom', (id) => roomsRepo.thunks.removeItem(id), 'Room deleted', refetchRoomsAndProperties);

export const updateOwnerProperty = withToast('updateProperty', (p) => propertiesRepo.thunks.updateItem({ id: p.id, changes: p }), 'Property updated', refetchProperties);
export const deleteOwnerProperty = withToast('deleteProperty', (id) => propertiesRepo.thunks.removeItem(id), 'Property deleted');

export const addOwnerIssue = withToast('addIssue', (i) => issuesRepo.thunks.createItem(i), 'Issue reported', () => issuesRepo.thunks.fetchAll());
export const updateOwnerIssueStatus = withToast('updateIssueStatus', ({ id, status }) => issuesRepo.thunks.updateItem({ id, changes: { status } }), 'Issue updated');
export const deleteOwnerIssue = withToast('deleteIssue', (id) => issuesRepo.thunks.removeItem(id), 'Issue deleted');

export const markOwnerNotificationRead = withToast('markNotificationRead', (id) => markNotificationRead(id), 'Notification marked as read');
export const markAllOwnerNotificationsRead = withToast('markAllNotificationsRead', () => markAllNotificationsRead(), 'Notifications marked as read');
export const deleteOwnerNotification = withToast('deleteNotification', (id) => notificationsRepo.thunks.removeItem(id), 'Notification deleted');
export const clearOwnerNotifications = withToast('clearNotifications', () => clearNotifications(), 'Notifications cleared');
export const sendOwnerNotification = withToast(
  'sendNotification',
  (n) => notificationsRepo.thunks.createItem({ title: n.title, message: n.message, targetRole: n.recipient || 'all' }),
  'Notification sent',
);

const savePolicyCall = plainCall('savePolicy', (policy) => http.put('/api/policies', policy));
const saveProfileCall = plainCall('saveProfile', (profile) => http.put('/api/profile', profile));
const changePasswordCall = plainCall('changePassword', ({ currentPassword, newPassword }) => http.put('/api/profile/password', { currentPassword, newPassword }));

export const saveOwnerPolicy = withToast('savePolicy', savePolicyCall, 'Policy saved', fetchOwnerAccount);
export const resetOwnerPolicy = withToast('resetPolicy', savePolicyCall, 'Policy reset', fetchOwnerAccount);
export const saveOwnerProfile = withToast('saveProfile', saveProfileCall, 'Profile updated', fetchOwnerAccount);
export const changeOwnerPassword = withToast('changePassword', changePasswordCall, 'Password changed successfully');

/**
 * Price of switching to a plan, computed by the server: new plan = full price,
 * upgrade = price minus the unused value of the current plan, downgrade = no
 * payment and no refund (needs the owner's confirmation).
 */
export const fetchPlanQuote = createAsyncThunk('ownerAccount/planQuote', async (planType, { rejectWithValue }) => {
  try {
    return await http.get(`/subscriptions/quote?planType=${encodeURIComponent(planType)}`);
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

/**
 * Start / change the owner's plan.
 *  - new plan or upgrade: pay the quoted amount through the gateway (Razorpay,
 *    or test mode), then the server re-checks the price and the payment.
 *  - downgrade: no payment; `confirmNoRefund` must be true.
 * Afterwards the plan list, account summary and notifications are reloaded.
 */
export const changeOwnerPlan = createAsyncThunk(
  'ownerAccount/changePlan',
  async ({ planType, requiresPayment, confirmNoRefund, description }, { dispatch, getState, rejectWithValue }) => {
    const user = getState().ownerAccount.profile || {};
    let proof = null;
    if (requiresPayment) {
      try {
        proof = await payOnline({ purpose: 'subscription', planType }, { description: description || 'RentBro subscription', name: user.name, email: user.email, phone: user.phone });
      } catch (err) {
        return rejectWithValue(err.message);
      }
    }
    try {
      const saved = await dispatch(
        subscriptionsRepo.thunks.createItem({
          planType,
          ...(confirmNoRefund ? { confirmNoRefund: true } : {}),
          ...(proof ? { quoteDate: proof.quoteDate, gatewayOrderId: proof.gatewayOrderId, gatewayPaymentId: proof.gatewayPaymentId, gatewaySignature: proof.gatewaySignature } : {}),
        }),
      ).unwrap();
      await Promise.all([dispatch(subscriptionsRepo.thunks.fetchAll()), dispatch(fetchOwnerAccount()), dispatch(notificationsRepo.thunks.fetchAll())]);
      return saved;
    } catch (err) {
      const message = typeof err === 'string' ? err : err?.message || 'Could not change the plan';
      return rejectWithValue(proof?.mode === 'razorpay' ? `${message} Your payment (${proof.gatewayPaymentId}) was received; contact support with this ID.` : message);
    }
  },
);

/** Cancel the running plan (no refund; the owner confirmed). */
export const cancelOwnerPlan = createAsyncThunk('ownerAccount/cancelPlan', async (id, { dispatch, rejectWithValue }) => {
  try {
    const { item } = await dispatch(subscriptionsRepo.thunks.updateItem({ id, changes: { status: 'cancelled', confirmNoRefund: true } })).unwrap();
    await Promise.all([dispatch(subscriptionsRepo.thunks.fetchAll()), dispatch(fetchOwnerAccount()), dispatch(notificationsRepo.thunks.fetchAll())]);
    return item;
  } catch (err) {
    return rejectWithValue(typeof err === 'string' ? err : err?.message || 'Could not cancel the plan');
  }
});

// ------------------------------------------------------------------ slice

const ownerAccountSlice = createSlice({
  name: 'ownerAccount',
  initialState: { policy: {}, profile: {}, subscription: null, status: 'idle', error: null, planQuote: { data: null, status: 'idle', error: null } },
  reducers: {
    clearPlanQuote: (s) => {
      s.planQuote = { data: null, status: 'idle', error: null };
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchOwnerAccount.fulfilled, (s, { payload }) => {
      Object.assign(s, payload);
    })
      .addCase(fetchPlanQuote.pending, (s) => {
        s.planQuote = { data: null, status: 'loading', error: null };
      })
      .addCase(fetchPlanQuote.fulfilled, (s, { payload }) => {
        s.planQuote = { data: payload, status: 'succeeded', error: null };
      })
      .addCase(fetchPlanQuote.rejected, (s, { payload, error }) => {
        s.planQuote = { data: null, status: 'failed', error: payload || error.message };
      })
      .addCase(loadOwnerData.pending, (s) => {
        if (s.status === 'idle') s.status = 'loading';
      })
      .addCase(loadOwnerData.fulfilled, (s) => {
        s.status = 'succeeded';
        s.error = null;
      })
      .addCase(loadOwnerData.rejected, (s, { payload }) => {
        s.status = s.status === 'loading' ? 'failed' : s.status;
        s.error = payload;
      });
  },
});

export const ownerReducers = { ownerAccount: ownerAccountSlice.reducer };
export const { clearPlanQuote } = ownerAccountSlice.actions;

// ------------------------------------------------------------------ selectors

const selectAccount = (s) => s.ownerAccount;
export const selectPlanQuote = (s) => s.ownerAccount.planQuote;

/** Documents per property, with a summary of what is still needed. */
export const selectOwnerDocumentsByProperty = createSelector([propertyDocumentsRepo.selectors.selectItems], (docs) => {
  const byProperty = {};
  docs.forEach((d) => {
    (byProperty[d.propertyId] = byProperty[d.propertyId] || []).push(d);
  });
  return byProperty;
});

export function documentSummary(docs = []) {
  const latest = (type) => docs.find((d) => d.docType === type);
  const required = REQUIRED_DOCUMENTS.map((r) => ({ ...r, doc: latest(r.type) || null }));
  return {
    required,
    missing: required.filter((r) => !r.doc).length,
    rejected: required.filter((r) => r.doc?.status === 'rejected').length,
    pending: required.filter((r) => r.doc?.status === 'pending').length,
    approved: required.filter((r) => r.doc?.status === 'approved').length,
  };
}

/** The signed-in owner's properties (the repository also holds the public catalogue). */
const selectMyPropertyRows = createSelector([propertiesRepo.selectors.selectItems, (s) => s.auth.user?.id], (items, me) =>
  items.filter((p) => Number(p.ownerId ?? p.owner?.id) === Number(me)),
);

export const selectOwnerProperties = createSelector([selectMyPropertyRows, selectOwnerDocumentsByProperty], (items, docsByProperty) =>
  items.map((p) => {
    const documents = docsByProperty[p.id] || [];
    return { ...mapOwnerProperty(p), documents, docs: documentSummary(documents) };
  }),
);

/** Rooms of the owner's properties, as the public pages show them, plus raw values for editing. */
export const selectOwnerRooms = createSelector([roomsRepo.selectors.selectItems, selectMyPropertyRows], (rooms, properties) => {
  const names = Object.fromEntries(properties.map((p) => [p.id, p.name]));
  return rooms
    .filter((r) => r.propertyId in names)
    .map((r) => ({ ...mapRoom(r), propertyName: names[r.propertyId] || `Property #${r.propertyId}`, rawStatus: r.status, maintenanceStatus: r.maintenanceStatus }))
    .sort((a, b) => a.propertyName.localeCompare(b.propertyName) || String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true }));
});
export const selectOwnerIssues = createSelector([issuesRepo.selectors.selectItems], (items) =>
  items.map(mapOwnerIssue).sort((a, b) => String(b.reportedDate).localeCompare(String(a.reportedDate))),
);
export const selectOwnerNotifications = createSelector([notificationsRepo.selectors.selectItems], (items) =>
  items.map(mapOwnerNotification).sort((a, b) => String(b.date).localeCompare(String(a.date))),
);

/** Everything the owner pages render, read from the store. */
export const selectOwner = createSelector(
  [selectOwnerProperties, selectOwnerIssues, selectOwnerNotifications, selectAccount],
  (properties, issues, notifications, account) => ({
    properties,
    issues,
    notifications,
    policy: account.policy,
    profile: account.profile,
    subscription: account.subscription,
    status: account.status,
    error: account.error,
  }),
);

export const selectOwnerUnreadCount = createSelector([selectOwnerNotifications], (n) => n.filter((x) => !x.read).length);
/** Issues still needing work: Open and In Progress. */
export const selectOwnerOpenIssues = createSelector([selectOwnerIssues], (i) => i.filter((x) => x.status === 'Open' || x.status === 'In Progress').length);
export const selectOwnerUser = createSelector([(s) => s.ownerAccount.profile, (s) => s.ownerAccount.subscription], (profile, sub) => ({
  ...profile,
  subscriptionPlan: sub?.currentPlan || null,
  subscriptionFee: sub?.monthlyFee || 0,
  subscription: sub,
}));

/** Rent actually collected this calendar month, from the rent_dues repository. */
export const selectOwnerRentThisMonth = createSelector([rentDuesRepo.selectors.selectItems], (dues) => {
  const month = new Date().toISOString().slice(0, 7);
  const thisMonth = dues.filter((d) => String(d.periodStart || d.dueDate || '').slice(0, 7) === month);
  const paid = thisMonth.filter((d) => normalizeStatus(d.status) === 'paid');
  return {
    collected: paid.reduce((n, d) => n + toNumber(d.amount), 0),
    billed: thisMonth.reduce((n, d) => n + toNumber(d.amount), 0),
    overdue: dues.filter((d) => normalizeStatus(d.status) === 'overdue').length,
  };
});

// ------------------------------------------------------------------ tenants & rent

const DUE_LABEL = { upcoming: 'Upcoming', due_soon: 'Due soon', overdue: 'Overdue', paid: 'Paid', waived: 'Waived' };
const dueRow = (d, names) => ({
  id: d.id,
  tenantId: d.tenantId,
  tenantName: names[d.tenantId] || `Tenant #${d.tenantId}`,
  propertyId: d.propertyId,
  period: String(d.periodStart || '').slice(0, 7),
  amount: toNumber(d.amount),
  dueDate: toISODate(d.dueDate),
  status: normalizeStatus(d.effectiveStatus || d.status),
  statusLabel: DUE_LABEL[normalizeStatus(d.effectiveStatus || d.status)] || statusLabel(d.status),
  paidAt: toISODate(d.paidAt),
  paidVia: d.paidVia || '',
});

/** Tenants currently staying in the owner's properties, with their latest rent due. */
export const selectOwnerTenants = createSelector(
  [tenantStaysRepo.selectors.selectItems, rentDuesRepo.selectors.selectItems, propertiesRepo.selectors.selectItems],
  (stays, dues, properties) => {
    const propertyNames = Object.fromEntries(properties.map((p) => [p.id, p.name]));
    const names = Object.fromEntries(stays.filter((s) => s.tenant).map((s) => [s.tenantId, s.tenant.name]));
    return stays
      .filter((s) => normalizeStatus(s.status) === 'active')
      .map((s) => {
        const mine = dues.filter((d) => d.tenantId === s.tenantId).sort((a, b) => String(b.periodStart).localeCompare(String(a.periodStart)));
        // The due that matters now: the oldest unpaid one, else the latest.
        const open = [...mine].reverse().find((d) => ['overdue', 'due_soon', 'upcoming'].includes(normalizeStatus(d.status)));
        const current = open || mine[0];
        return {
          id: s.id,
          tenantId: s.tenantId,
          name: s.tenant?.name || `Tenant #${s.tenantId}`,
          email: s.tenant?.email || '',
          phone: s.tenant?.phone || '',
          propertyId: s.propertyId,
          propertyName: s.property?.name || propertyNames[s.propertyId] || '',
          room: s.roomEntity?.roomNumber || '',
          bed: s.bedNumber || '',
          moveInDate: toISODate(s.moveInDate),
          due: current ? dueRow(current, names) : null,
        };
      })
      .sort((a, b) => a.propertyName.localeCompare(b.propertyName) || String(a.room).localeCompare(String(b.room), undefined, { numeric: true }));
  },
);

/** Every rent due in the owner's properties, newest period first. */
export const selectOwnerRentLedger = createSelector([rentDuesRepo.selectors.selectItems, tenantStaysRepo.selectors.selectItems, propertiesRepo.selectors.selectItems], (dues, stays, properties) => {
  const names = Object.fromEntries(stays.filter((s) => s.tenant).map((s) => [s.tenantId, s.tenant.name]));
  const propertyNames = Object.fromEntries(properties.map((p) => [p.id, p.name]));
  return dues
    .map((d) => ({ ...dueRow(d, names), propertyName: propertyNames[d.propertyId] || '' }))
    .sort((a, b) => b.period.localeCompare(a.period) || a.tenantName.localeCompare(b.tenantName));
});

/** Booking requests (unpaid holds) waiting on the tenant's payment. */
export const selectOwnerBookingRequests = createSelector([bookingRequestsRepo.selectors.selectItems], (rows) =>
  rows
    .map((r) => ({
      id: r.id,
      name: r.tenant?.name || `Tenant #${r.tenantId}`,
      email: r.tenant?.email || '',
      phone: r.tenant?.phone || '',
      propertyName: r.property?.name || '',
      room: r.roomEntity?.roomNumber || '',
      requestedDate: toISODate(r.requestedDate || r.createdAt),
      message: r.message || '',
      status: normalizeStatus(r.status),
    }))
    .sort((a, b) => String(b.requestedDate).localeCompare(String(a.requestedDate))),
);
