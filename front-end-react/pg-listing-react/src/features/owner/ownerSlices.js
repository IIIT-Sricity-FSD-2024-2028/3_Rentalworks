import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import * as api from '../../dashboards/owner/services/api';
import { showToast } from '../ui/uiSlice';

// ------------------------------------------------------------------ mappers

export const mapOwnerProperty = (p) => ({
  id: p.id,
  images: p.images || [],
  description: p.description || '',
  name: p.name,
  address: p.address || p.location || '',
  city: p.city || '',
  state: p.state || '',
  pincode: p.pincode || '',
  type: p.type || 'Mixed',
  totalCapacity: p.totalCapacity ?? 0,
  totalRooms: p.totalRooms ?? 0,
  occupiedRooms: p.occupiedRooms ?? 0,
  monthlyRent: Number(p.monthlyRent ?? p.rentMin ?? 0),
  amenities: p.amenities || [],
  gender: p.gender || (p.type === 'Female' ? 'girls' : p.type === 'Male' ? 'boys' : 'unisex'),
  status: p.status === 'approved' ? 'Active' : p.status ? p.status.charAt(0).toUpperCase() + p.status.slice(1) : 'Pending',
  addedDate: p.createdAt ? String(p.createdAt).split('T')[0] : '',
  owner: p.owner ? p.owner.name : '',
  ownerEmail: p.owner ? p.owner.email : '',
});

const ISSUE_STATUS = { open: 'Open', 'in-progress': 'In Progress', 'in progress': 'In Progress', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed' };

export const mapOwnerIssue = (i) => ({
  id: i.id,
  propertyId: i.propertyId,
  propertyName: i.property ? i.property.name : i.propertyName || '',
  title: i.title || i.description || 'Issue reported',
  description: i.description || '',
  category: i.category || 'Maintenance',
  priority: i.priority ? i.priority.charAt(0).toUpperCase() + i.priority.slice(1) : 'Medium',
  status: ISSUE_STATUS[String(i.status || '').toLowerCase()] || i.status || 'Open',
  reportedBy: i.reportedBy || (i.tenant ? i.tenant.name : 'Tenant'),
  reportedDate: i.reportedAt || (i.createdAt ? String(i.createdAt).split('T')[0] : ''),
});

export const mapOwnerNotification = (n) => ({
  id: n.id,
  title: n.title,
  message: n.message,
  type: n.type || 'reminder',
  read: Boolean(n.read || n.isRead),
  date: n.sentAt ? String(n.sentAt).split('T')[0] : n.createdAt ? String(n.createdAt).split('T')[0] : '',
});

export function ownerPropertyPayload(p) {
  return {
    name: p.name,
    address: p.address,
    city: p.city,
    state: p.state,
    pincode: p.pincode,
    location: `${p.city}, ${p.state}`,
    type: p.type,
    gender: p.gender,
    totalCapacity: Number(p.totalCapacity),
    totalRooms: Number(p.totalRooms),
    occupiedRooms: Number(p.occupiedRooms) || 0,
    monthlyRent: Number(p.monthlyRent),
    rentMin: Number(p.monthlyRent),
    rentMax: Number(p.monthlyRent),
    rooms: `${Number(p.occupiedRooms) || 0}/${p.totalRooms}`,
    amenities: p.amenities,
    description: p.description,
    images: p.images || [],
  };
}

// ------------------------------------------------------------------ thunks

export const loadOwnerData = createAsyncThunk('owner/load', async (_, { rejectWithValue }) => {
  try {
    const [properties, issues, notifications, policy, profile, subscription] = await Promise.all([
      api.getProperties(),
      api.getIssues(),
      api.getNotifications(),
      api.getPolicy(),
      api.getProfile(),
      api.getSubscription().catch(() => null),
    ]);
    return {
      properties: properties.map(mapOwnerProperty),
      issues: issues.map(mapOwnerIssue),
      notifications: notifications.map(mapOwnerNotification),
      policy: policy || {},
      profile: profile || {},
      subscription: subscription || null,
    };
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

/**
 * One write path for every owner mutation: call the API, reload the
 * portal data from the server, then toast. Returns true on success.
 */
const ownerMutation = (type, call, successMessage) =>
  createAsyncThunk(`owner/${type}`, async (arg, { dispatch, rejectWithValue }) => {
    try {
      await call(arg);
      await dispatch(loadOwnerData());
      dispatch(showToast({ message: successMessage, type: 'success' }));
      return true;
    } catch (err) {
      dispatch(showToast({ message: err.message || 'Operation failed', type: 'error' }));
      return rejectWithValue(err.message);
    }
  });

export const addOwnerProperty = ownerMutation('addProperty', (p) => api.createProperty(ownerPropertyPayload(p)), 'Property submitted for review');
export const updateOwnerProperty = ownerMutation('updateProperty', (p) => api.updateProperty(p.id, ownerPropertyPayload(p)), 'Property updated');
export const deleteOwnerProperty = ownerMutation('deleteProperty', (id) => api.deleteProperty(id), 'Property deleted');

export const addOwnerIssue = ownerMutation(
  'addIssue',
  (i) => api.createIssue({ propertyId: Number(i.propertyId), title: i.title, description: i.description, category: i.category, priority: String(i.priority).toLowerCase() }),
  'Issue reported',
);
export const updateOwnerIssueStatus = ownerMutation(
  'updateIssueStatus',
  ({ id, status }) => api.updateIssueStatus(id, String(status).toLowerCase().replace(' ', '-')),
  'Issue updated',
);
export const deleteOwnerIssue = ownerMutation('deleteIssue', (id) => api.deleteIssue(id), 'Issue deleted');

export const markOwnerNotificationRead = ownerMutation('markNotificationRead', (id) => api.markNotificationRead(id), 'Notification marked as read');
export const markAllOwnerNotificationsRead = ownerMutation('markAllNotificationsRead', () => api.markAllNotificationsRead(), 'Notifications marked as read');
export const deleteOwnerNotification = ownerMutation('deleteNotification', (id) => api.deleteNotification(id), 'Notification deleted');
export const clearOwnerNotifications = ownerMutation('clearNotifications', () => api.clearAllNotifications(), 'Notifications cleared');
export const sendOwnerNotification = ownerMutation(
  'sendNotification',
  (n) => api.createNotification({ title: n.title, message: n.message, type: 'info', priority: 'normal', targetRole: String(n.recipient || 'all').toLowerCase() }),
  'Notification sent',
);

export const saveOwnerPolicy = ownerMutation('savePolicy', (policy) => api.updatePolicy(policy), 'Policy saved');
export const resetOwnerPolicy = ownerMutation('resetPolicy', (policy) => api.updatePolicy(policy), 'Policy reset');
export const saveOwnerProfile = ownerMutation('saveProfile', (profile) => api.updateProfile(profile), 'Profile updated');
export const changeOwnerPassword = ownerMutation(
  'changePassword',
  ({ currentPassword, newPassword }) => api.changePassword(currentPassword, newPassword),
  'Password changed successfully',
);

// ------------------------------------------------------------------ slice

const ownerSlice = createSlice({
  name: 'owner',
  initialState: {
    properties: [],
    issues: [],
    notifications: [],
    policy: {},
    profile: {},
    subscription: null,
    status: 'idle',
    error: null,
    busy: false,
  },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(loadOwnerData.pending, (s) => {
      if (s.status === 'idle') s.status = 'loading';
    })
      .addCase(loadOwnerData.fulfilled, (s, { payload }) => {
        Object.assign(s, payload);
        s.status = 'succeeded';
        s.error = null;
      })
      .addCase(loadOwnerData.rejected, (s, { payload }) => {
        s.status = s.status === 'loading' ? 'failed' : s.status;
        s.error = payload;
      })
      .addMatcher(
        (a) => a.type.startsWith('owner/') && !a.type.startsWith('owner/load') && a.type.endsWith('/pending'),
        (s) => {
          s.busy = true;
        },
      )
      .addMatcher(
        (a) => a.type.startsWith('owner/') && !a.type.startsWith('owner/load') && (a.type.endsWith('/fulfilled') || a.type.endsWith('/rejected')),
        (s) => {
          s.busy = false;
        },
      );
  },
});

export const ownerReducers = { owner: ownerSlice.reducer };

// ------------------------------------------------------------------ selectors
export const selectOwner = (s) => s.owner;
export const selectOwnerUnreadCount = createSelector([(s) => s.owner.notifications], (n) => n.filter((x) => !x.read).length);
export const selectOwnerOpenIssues = createSelector([(s) => s.owner.issues], (i) => i.filter((x) => x.status === 'Open').length);
export const selectOwnerUser = createSelector([(s) => s.owner.profile, (s) => s.owner.subscription], (profile, sub) => ({
  ...profile,
  subscriptionPlan: sub?.currentPlan || null,
  subscriptionFee: sub?.monthlyFee || 0,
  subscription: sub,
}));
