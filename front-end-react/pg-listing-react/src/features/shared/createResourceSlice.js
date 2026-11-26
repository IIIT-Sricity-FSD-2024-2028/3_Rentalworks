import { createSlice, createAsyncThunk, isFulfilled, isPending, isRejected } from '@reduxjs/toolkit';
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

  // Every api function receives the signed-in role last, so one repository
  // slice can call the right controller for owner / tenant / admin.
  const roleOf = (getState) => getState()?.auth?.user?.role;

  const fetchAll = createAsyncThunk(`${name}/fetchAll`, async (arg, { rejectWithValue, getState }) => {
    try {
      return asArray(await api.list(arg, roleOf(getState))).map(mapItem);
    } catch (err) {
      return rejectWithValue(fail(err));
    }
  });

  const createItem = createAsyncThunk(`${name}/create`, async (data, { rejectWithValue, getState }) => {
    if (!api.create) return rejectWithValue('Create is not supported');
    try {
      const created = await api.create(data, roleOf(getState));
      return created && typeof created === 'object' ? mapItem(created) : null;
    } catch (err) {
      return rejectWithValue(fail(err));
    }
  });

  const updateItem = createAsyncThunk(`${name}/update`, async ({ id, changes }, { rejectWithValue, getState }) => {
    if (!api.update) return rejectWithValue('Update is not supported');
    try {
      const updated = await api.update(id, changes, roleOf(getState));
      return { id, changes, item: updated && typeof updated === 'object' && idOf(updated) != null ? mapItem(updated) : null };
    } catch (err) {
      return rejectWithValue(fail(err));
    }
  });

  const removeItem = createAsyncThunk(`${name}/remove`, async (id, { rejectWithValue, getState }) => {
    if (!api.remove) return rejectWithValue('Delete is not supported');
    try {
      await api.remove(id, roleOf(getState));
      return id;
    } catch (err) {
      return rejectWithValue(fail(err));
    }
  });

  const slice = createSlice({
    name,
    initialState: { items: [], status: 'idle', error: null, mutating: false, mutationError: null, lastFetched: null },
    reducers: {
      setItems(state, { payload }) {
        state.items = payload;
      },
      upsertItem(state, { payload }) {
        const idx = state.items.findIndex((x) => sameId(idOf(x), idOf(payload)));
        if (idx >= 0) state.items[idx] = { ...state.items[idx], ...payload };
        else state.items.unshift(payload);
      },
      removeLocal(state, { payload: id }) {
        state.items = state.items.filter((x) => !sameId(idOf(x), id));
      },
      clear(state) {
        state.items = [];
        state.status = 'idle';
        state.error = null;
      },
      ...reducers,
    },
    extraReducers: (builder) => {
      builder
        .addCase(fetchAll.pending, (state) => {
          state.status = 'loading';
          state.error = null;
        })
        .addCase(fetchAll.fulfilled, (state, { payload }) => {
          state.status = 'succeeded';
          state.items = payload;
          state.lastFetched = Date.now();
        })
        .addCase(fetchAll.rejected, (state, { payload }) => {
          state.status = 'failed';
          state.error = payload;
        })
        .addCase(createItem.fulfilled, (state, { payload }) => {
          if (payload) state.items.unshift(payload);
        })
        .addCase(updateItem.fulfilled, (state, { payload }) => {
          const idx = state.items.findIndex((x) => sameId(idOf(x), payload.id));
          if (idx >= 0) state.items[idx] = { ...state.items[idx], ...payload.changes, ...(payload.item || {}) };
        })
        .addCase(removeItem.fulfilled, (state, { payload: id }) => {
          state.items = state.items.filter((x) => !sameId(idOf(x), id));
        });

      if (extraReducers) extraReducers(builder);

      // Flags shared by every mutation. Matchers, because a builder allows only
      // one addCase per action type.
      const mutations = [createItem, updateItem, removeItem];
      builder
        .addMatcher(isPending(...mutations), (state) => {
          state.mutating = true;
          state.mutationError = null;
        })
        .addMatcher(isFulfilled(...mutations), (state) => {
          state.mutating = false;
        })
        .addMatcher(isRejected(...mutations), (state, { payload }) => {
          state.mutating = false;
          state.mutationError = payload;
        });
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
