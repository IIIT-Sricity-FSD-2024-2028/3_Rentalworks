import { createSlice, createAsyncThunk, isAnyOf, isFulfilled, isPending, isRejected } from '@reduxjs/toolkit';
import { asArray } from '../../services/apiClient';
import { withNormalizedStatus } from '../../utils/normalize';

/**
 * Factory for the common "list + create + update + delete" REST resource.
 *
 *   const issues = createResourceSlice({
 *     name: 'tenantIssues',
 *     api: { list, create, update, remove },   // functions returning promises
 *     mapItem: (raw) => ({ ...raw }),          // optional normaliser (status is already normalised)
 *   });
 *
 * The reducer must be mounted in the store under the same key as `name`.
 * Exposes `thunks` (fetchAll, createItem, updateItem, removeItem),
 * `actions` (setItems, upsertItem, removeLocal, clear) and `selectors`.
 */
export function createResourceSlice({ name, api, mapItem: customMap = (x) => x, idKey = 'id', reducers = {}, extraReducers }) {
  // Every row gets one status spelling ('in-progress' / 'ACTIVE' → 'in_progress' / 'active')
  // before the slice-specific mapper sees it.
  const mapItem = (raw) => customMap(withNormalizedStatus(raw));
  const idOf = (item) => item?.[idKey];
  const sameId = (a, b) => String(a) === String(b);
  const fail = (err) => err?.message || 'Request failed';
  const putItem = (items, item) => {
    const index = items.findIndex((row) => sameId(idOf(row), idOf(item)));
    if (index === -1) items.unshift(item);
    else items[index] = { ...items[index], ...item };
  };
  const initialState = {
    items: [],
    status: 'idle',
    error: null,
    mutating: false,
    mutationError: null,
    lastFetched: null,
    fetchRequestId: null,
    pendingMutations: {},
  };

  const fetchAll = createAsyncThunk(`${name}/fetchAll`, async (arg, { rejectWithValue }) => {
    try {
      return asArray(await api.list(arg)).map(mapItem);
    } catch (err) {
      return rejectWithValue(fail(err));
    }
  });

  const createItem = createAsyncThunk(`${name}/create`, async (data, { rejectWithValue }) => {
    if (!api.create) return rejectWithValue('Create is not supported');
    try {
      const created = await api.create(data);
      return created && typeof created === 'object' ? mapItem(created) : null;
    } catch (err) {
      return rejectWithValue(fail(err));
    }
  });

  const updateItem = createAsyncThunk(`${name}/update`, async ({ id, changes }, { rejectWithValue }) => {
    if (!api.update) return rejectWithValue('Update is not supported');
    try {
      const updated = await api.update(id, changes);
      return { id, changes, item: updated && typeof updated === 'object' && idOf(updated) != null ? mapItem(updated) : null };
    } catch (err) {
      return rejectWithValue(fail(err));
    }
  });

  const removeItem = createAsyncThunk(`${name}/remove`, async (id, { rejectWithValue }) => {
    if (!api.remove) return rejectWithValue('Delete is not supported');
    try {
      await api.remove(id);
      return id;
    } catch (err) {
      return rejectWithValue(fail(err));
    }
  });

  const slice = createSlice({
    name,
    initialState,
    reducers: {
      setItems(state, { payload }) {
        state.items = payload;
      },
      upsertItem(state, { payload }) {
        putItem(state.items, payload);
      },
      removeLocal(state, { payload: id }) {
        state.items = state.items.filter((x) => !sameId(idOf(x), id));
      },
      clear() {
        return initialState;
      },
      ...reducers,
    },
    extraReducers: (builder) => {
      builder
        .addCase(fetchAll.pending, (state, { meta }) => {
          state.fetchRequestId = meta.requestId;
          state.status = 'loading';
          state.error = null;
        })
        .addCase(fetchAll.fulfilled, (state, { payload, meta }) => {
          // Ignore older responses and requests started before a logout or clear.
          if (state.fetchRequestId !== meta.requestId) return;
          state.fetchRequestId = null;
          state.status = 'succeeded';
          state.items = payload;
          state.lastFetched = Date.now();
        })
        .addCase(fetchAll.rejected, (state, { payload, meta }) => {
          if (state.fetchRequestId !== meta.requestId) return;
          state.fetchRequestId = null;
          state.status = 'failed';
          state.error = payload;
        })
        .addCase(createItem.fulfilled, (state, { payload, meta }) => {
          if (state.pendingMutations[meta.requestId] && payload) putItem(state.items, payload);
        })
        .addCase(updateItem.fulfilled, (state, { payload, meta }) => {
          if (!state.pendingMutations[meta.requestId]) return;
          const idx = state.items.findIndex((x) => sameId(idOf(x), payload.id));
          if (idx >= 0) state.items[idx] = { ...state.items[idx], ...payload.changes, ...(payload.item || {}) };
        })
        .addCase(removeItem.fulfilled, (state, { payload: id, meta }) => {
          if (!state.pendingMutations[meta.requestId]) return;
          state.items = state.items.filter((x) => !sameId(idOf(x), id));
        });

      if (extraReducers) extraReducers(builder);

      // Flags shared by every mutation. Matchers, because a builder allows only
      // one addCase per action type.
      const mutations = [createItem, updateItem, removeItem];
      builder
        .addMatcher(isPending(...mutations), (state, { meta }) => {
          state.pendingMutations[meta.requestId] = true;
          state.mutating = true;
          state.mutationError = null;
        })
        .addMatcher(
          isAnyOf(isFulfilled(...mutations), isRejected(...mutations)),
          (state, action) => {
            if (!state.pendingMutations[action.meta.requestId]) return;
            delete state.pendingMutations[action.meta.requestId];
            state.mutating = Object.keys(state.pendingMutations).length > 0;
            if (action.meta.requestStatus === 'rejected') state.mutationError = action.payload;
          },
        );
    },
  });

  const selectSlice = (state) => state[name];
  return {
    slice,
    reducer: slice.reducer,
    actions: slice.actions,
    thunks: { fetchAll, createItem, updateItem, removeItem },
    selectors: {
      selectSlice,
      selectItems: (state) => state[name].items,
      selectStatus: (state) => state[name].status,
      selectError: (state) => state[name].error,
      selectIsLoading: (state) => state[name].status === 'loading',
      selectMutating: (state) => state[name].mutating,
      selectById: (state, id) => state[name].items.find((x) => sameId(idOf(x), id)),
    },
  };
}
