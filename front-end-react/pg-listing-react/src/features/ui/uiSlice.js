import { createSlice, nanoid } from '@reduxjs/toolkit';

/**
 * Global UI state: toast notifications.
 * Any component can `dispatch(showToast({ message, type }))`.
 */
const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    toasts: [],
  },
  reducers: {
    showToast: {
      reducer(state, { payload }) {
        state.toasts.push(payload);
        if (state.toasts.length > 4) state.toasts.shift();
      },
      prepare(input) {
        const payload = typeof input === 'string' ? { message: input } : input;
        return { payload: { id: nanoid(), type: 'info', duration: 3500, ...payload } };
      },
    },
    dismissToast(state, { payload: id }) {
      state.toasts = state.toasts.filter((t) => t.id !== id);
    },
  },
});

export const { showToast, dismissToast } = uiSlice.actions;
export default uiSlice.reducer;

export const selectToasts = (state) => state.ui.toasts;

// Convenience action creators
export const toastSuccess = (message) => showToast({ message, type: 'success' });
export const toastError = (message) => showToast({ message, type: 'error', duration: 5000 });
export const toastInfo = (message) => showToast({ message, type: 'info' });
