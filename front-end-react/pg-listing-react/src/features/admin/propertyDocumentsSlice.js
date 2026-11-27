import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { http } from '../../services/apiClient';

const documentPath = (id) => `/users/session/property-documents/${id}`;
const sessionOptions = { auth: false, credentials: 'include' };

export const fetchPropertyDocument = createAsyncThunk('propertyDetailsDocuments/fetch', async (id, { rejectWithValue }) => {
  try {
    return await http.get(documentPath(id), sessionOptions);
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const downloadPropertyDocument = createAsyncThunk('propertyDetailsDocuments/download', async ({ id, name }, { rejectWithValue }) => {
  try {
    const blob = await http.get(`${documentPath(id)}?download=true`, { ...sessionOptions, responseType: 'blob' });
    // Keep file bytes and the temporary URL out of Redux; only metadata belongs in the store.
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    try {
      document.body.appendChild(link);
      link.click();
    } finally {
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

// The details document an owner attaches when applying (stored on the property).
// Not the property_documents table: that is propertyDocumentsRepo in features/repositories.
const propertyDocumentsSlice = createSlice({
  name: 'propertyDetailsDocuments',
  initialState: {},
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchPropertyDocument.pending, (state, { meta }) => {
      state[meta.arg] = { status: 'loading', requestId: meta.requestId };
    })
      .addCase(fetchPropertyDocument.fulfilled, (state, { meta, payload }) => {
        if (state[meta.arg]?.requestId === meta.requestId) state[meta.arg] = { status: 'ready', metadata: payload };
      })
      .addCase(fetchPropertyDocument.rejected, (state, { meta, payload }) => {
        if (state[meta.arg]?.requestId === meta.requestId) state[meta.arg] = { status: 'error', error: payload };
      });
  },
});

export const selectPropertyDocument = (state, id) => state.propertyDetailsDocuments[id];
export default propertyDocumentsSlice.reducer;
