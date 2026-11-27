import { createAsyncThunk } from '@reduxjs/toolkit';
import { http } from '../../services/apiClient';
import { createRepositorySlice } from './createRepositorySlice';

/** Mark one warden alert read (workflow action on top of the 4 CRUD thunks). */
export const markWardenNotificationRead = createAsyncThunk('wardenNotifications/markRead', async (id, { rejectWithValue }) => {
  try {
    await http.put(`/warden-notifications/${id}/read`);
    return id;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const markAllWardenNotificationsRead = createAsyncThunk('wardenNotifications/markAllRead', async (_, { rejectWithValue }) => {
  try {
    await http.put('/warden-notifications/mark-all-read');
    return true;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

// Repository: warden_notifications (alerts addressed to wardens, incl. owner messages)
export const wardenNotificationsRepo = createRepositorySlice({
  name: 'wardenNotifications',
  base: '/warden-notifications',
  updateMethod: 'put',
  mapItem: (n) => ({ ...n, read: Boolean(n.read || n.isRead) }),
  extraReducers: (b) => {
    b.addCase(markWardenNotificationRead.fulfilled, (s, { payload: id }) => {
      const n = s.items.find((x) => String(x.id) === String(id));
      if (n) Object.assign(n, { read: true, isRead: true });
    }).addCase(markAllWardenNotificationsRead.fulfilled, (s) => {
      s.items.forEach((n) => Object.assign(n, { read: true, isRead: true }));
    });
  },
});
