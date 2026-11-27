import { createAsyncThunk } from '@reduxjs/toolkit';
import { http } from '../../services/apiClient';
import { createRepositorySlice } from './createRepositorySlice';

// Owners use /api/notifications, which tracks read / dismissed per owner.
const isOwner = (getState) => getState()?.auth?.user?.role === 'owner';

/** Mark one notification read (workflow action on top of the 4 CRUD thunks). */
export const markNotificationRead = createAsyncThunk('notifications/markRead', async (id, { getState, rejectWithValue }) => {
  try {
    if (isOwner(getState)) await http.put(`/api/notifications/${id}/read`);
    else await http.patch(`/notifications/${id}/read`);
    return id;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const markAllNotificationsRead = createAsyncThunk('notifications/markAllRead', async (_, { getState, rejectWithValue }) => {
  try {
    if (isOwner(getState)) await http.put('/api/notifications/mark-all-read');
    else await http.patch('/notifications/read-all');
    return true;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

/** Owners can dismiss their whole feed (per-owner receipts, nothing is deleted for others). */
export const clearNotifications = createAsyncThunk('notifications/clearAll', async (_, { rejectWithValue }) => {
  try {
    await http.delete('/api/notifications');
    return true;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

// Repository: notifications (announcements and messages for every role).
export const notificationsRepo = createRepositorySlice({
  name: 'notifications',
  base: '/notifications',
  roleBase: { owner: '/api/notifications' },
  mapItem: (n) => ({ ...n, read: Boolean(n.read || n.isRead) }),
  toCreate: (n, role) =>
    role === 'owner'
      ? { title: n.title, message: n.message, type: n.type || 'info', priority: n.priority || 'normal', targetRole: String(n.targetRole || 'all').toLowerCase() }
      : {
          title: n.title,
          message: n.message,
          type: n.type || 'announcement',
          priority: n.priority || 'routine',
          recipients: Number(n.recipients) || 1,
          ...(n.targetRole ? { targetRole: n.targetRole } : {}),
          ...(n.userId ? { userId: Number(n.userId) } : {}),
          ...(n.byUserId ? { byUserId: Number(n.byUserId) } : {}),
        },
  extraReducers: (b) => {
    b.addCase(markNotificationRead.fulfilled, (s, { payload: id }) => {
      const n = s.items.find((x) => String(x.id) === String(id));
      if (n) Object.assign(n, { read: true, isRead: true });
    })
      .addCase(markAllNotificationsRead.fulfilled, (s) => {
        s.items.forEach((n) => Object.assign(n, { read: true, isRead: true }));
      })
      .addCase(clearNotifications.fulfilled, (s) => {
        s.items = [];
      });
  },
});
