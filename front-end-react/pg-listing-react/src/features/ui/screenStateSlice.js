import { createSlice } from '@reduxjs/toolkit';

// Screen controls are scoped to the mounted React component that owns them.
// An entry marked `secret` (a password being typed or shown once) is masked in
// Redux DevTools (see app/store.js) and removed when its component unmounts.
const screenStateSlice = createSlice({
  name: 'screenState',
  initialState: {},
  reducers: {
    setScreenValue(state, { payload: { id, value, secret } }) {
      state[id] = secret ? { value, secret: true } : { value };
    },
    clearScreenValue(state, { payload: id }) {
      delete state[id];
    },
  },
});

export const { setScreenValue, clearScreenValue } = screenStateSlice.actions;
export default screenStateSlice.reducer;
