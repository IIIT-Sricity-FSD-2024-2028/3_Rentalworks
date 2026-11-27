import { createSlice } from '@reduxjs/toolkit';

// Screen controls are scoped to the mounted React component that owns them.
const screenStateSlice = createSlice({
  name: 'screenState',
  initialState: {},
  reducers: {
    setScreenValue(state, { payload: { id, value } }) {
      state[id] = { value };
    },
    clearScreenValue(state, { payload: id }) {
      delete state[id];
    },
  },
});

export const { setScreenValue, clearScreenValue } = screenStateSlice.actions;
export default screenStateSlice.reducer;
