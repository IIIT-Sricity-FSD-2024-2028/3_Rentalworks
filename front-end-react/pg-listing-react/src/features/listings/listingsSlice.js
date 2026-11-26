import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { http, asArray } from '../../services/apiClient';
import { mapProperty, isPublicProperty } from './listingMappers';

export const INITIAL_FILTERS = {
  sort: 'low',
  price: 'all',
  room: [],
  gender: [],
  food: [],
  amenity: [],
<<<<<<< HEAD
  rating: 'all',
=======
  availableOnly: false,
>>>>>>> redux-migration
};

export const CITIES = ['All', 'Chennai', 'Bangalore', 'Mumbai', 'Pune', 'Hyderabad'];

// ------------------------------------------------------------------ thunks

/** Public catalogue: approved properties + live room availability. */
export const fetchListings = createAsyncThunk(
  'listings/fetchListings',
  async (_, { rejectWithValue }) => {
    try {
      const [props, rooms] = await Promise.all([
        http.get('/properties', { auth: false }),
        http.get('/rooms', { auth: false }).catch(() => []),
      ]);
      return { properties: asArray(props), rooms: asArray(rooms) };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
  {
    // Don't refetch while a request is in flight.
    condition: (_, { getState }) => getState().listings.status !== 'loading',
  },
);

export const fetchListingById = createAsyncThunk('listings/fetchListingById', async (id, { rejectWithValue }) => {
  try {
    const [prop, rooms] = await Promise.all([
      http.get(`/properties/${id}`, { auth: false }),
      http.get('/rooms', { auth: false }).catch(() => []),
    ]);
    return { property: prop, rooms: asArray(rooms) };
  } catch (err) {
    return rejectWithValue(err.status === 404 ? 'This property could not be found.' : err.message);
  }
});

// ------------------------------------------------------------------ slice

const listingsSlice = createSlice({
  name: 'listings',
  initialState: {
    properties: [],
    rooms: [],
    status: 'idle',
    error: null,
    detail: { id: null, property: null, rooms: [], status: 'idle', error: null },
    filters: INITIAL_FILTERS,
    search: '',
    city: 'All',
    filterPanelOpen: false,
<<<<<<< HEAD
=======
    refreshing: false,
    lastUpdated: null,
>>>>>>> redux-migration
  },
  reducers: {
    setFilter(state, { payload: { key, value } }) {
      state.filters[key] = value;
    },
    toggleFilterValue(state, { payload: { key, value } }) {
      const list = state.filters[key];
      state.filters[key] = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    },
    resetFilters(state) {
      state.filters = INITIAL_FILTERS;
      state.search = '';
      state.city = 'All';
    },
    setSearch(state, { payload }) {
      state.search = payload;
    },
    setCity(state, { payload }) {
      state.city = payload || 'All';
    },
    setFilterPanelOpen(state, { payload }) {
      state.filterPanelOpen = Boolean(payload);
    },
  },
  extraReducers: (builder) => {
    builder
<<<<<<< HEAD
      .addCase(fetchListings.pending, (state) => {
        state.status = 'loading';
=======
      // A background refresh (data already on screen) keeps showing the old data
      // instead of flashing a spinner; `refreshing` tells the UI a refresh is running.
      .addCase(fetchListings.pending, (state) => {
        if (state.status === 'succeeded') state.refreshing = true;
        else state.status = 'loading';
>>>>>>> redux-migration
        state.error = null;
      })
      .addCase(fetchListings.fulfilled, (state, { payload }) => {
        state.status = 'succeeded';
<<<<<<< HEAD
        state.properties = payload.properties;
        state.rooms = payload.rooms;
      })
      .addCase(fetchListings.rejected, (state, { payload }) => {
        state.status = 'failed';
        state.error = payload;
      })
      .addCase(fetchListingById.pending, (state, { meta }) => {
        state.detail = { ...state.detail, id: meta.arg, status: 'loading', error: null };
=======
        state.refreshing = false;
        state.properties = payload.properties;
        state.rooms = payload.rooms;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchListings.rejected, (state, { payload }) => {
        state.refreshing = false;
        // Keep showing the last good data if a background refresh fails.
        if (state.status !== 'succeeded') {
          state.status = 'failed';
          state.error = payload;
        }
      })
      .addCase(fetchListingById.pending, (state, { meta }) => {
        const sameProperty = String(state.detail.id) === String(meta.arg) && state.detail.property;
        state.detail = { ...state.detail, id: meta.arg, status: sameProperty ? 'succeeded' : 'loading', error: null };
>>>>>>> redux-migration
      })
      .addCase(fetchListingById.fulfilled, (state, { payload, meta }) => {
        state.detail = {
          id: meta.arg,
          property: payload.property,
          rooms: payload.rooms.filter((r) => String(r.propertyId ?? r.property?.id) === String(meta.arg)),
          status: 'succeeded',
          error: null,
        };
      })
<<<<<<< HEAD
      .addCase(fetchListingById.rejected, (state, { payload }) => {
=======
      .addCase(fetchListingById.rejected, (state, { payload, meta }) => {
        if (String(state.detail.id) === String(meta.arg) && state.detail.property) return;
>>>>>>> redux-migration
        state.detail.status = 'failed';
        state.detail.error = payload;
      });
  },
});

export const { setFilter, toggleFilterValue, resetFilters, setSearch, setCity, setFilterPanelOpen } = listingsSlice.actions;
export default listingsSlice.reducer;

// ------------------------------------------------------------------ selectors

const selectListingsState = (state) => state.listings;
export const selectListingsStatus = (state) => state.listings.status;
export const selectListingsError = (state) => state.listings.error;
<<<<<<< HEAD
=======
export const selectListingsRefreshing = (state) => state.listings.refreshing;
export const selectListingsUpdatedAt = (state) => state.listings.lastUpdated;
>>>>>>> redux-migration
export const selectFilters = (state) => state.listings.filters;
export const selectSearch = (state) => state.listings.search;
export const selectCity = (state) => state.listings.city;
export const selectFilterPanelOpen = (state) => state.listings.filterPanelOpen;

export const selectAllListings = createSelector([selectListingsState], ({ properties, rooms }) =>
  properties
    .filter(isPublicProperty)
    .map((p, idx) =>
      mapProperty(
        p,
        rooms.filter((r) => String(r.propertyId ?? r.property?.id) === String(p.id)),
        idx,
      ),
    ),
);

<<<<<<< HEAD
=======
/** Cities that actually have listings, plus the defaults so the picker never looks empty. */
export const selectCities = createSelector([selectAllListings], (listings) => {
  const fromData = listings.map((l) => l.city).filter(Boolean);
  return ['All', ...new Set([...CITIES.slice(1), ...fromData])];
});

>>>>>>> redux-migration
export const selectFilteredListings = createSelector(
  [selectAllListings, selectFilters, selectSearch, selectCity],
  (listings, filters, search, city) => {
    const q = search.trim().toLowerCase();
    const result = listings.filter((item) => {
<<<<<<< HEAD
      if (city !== 'All' && !item.location.toLowerCase().includes(city.toLowerCase())) return false;
=======
      if (city !== 'All' && item.city.toLowerCase() !== city.toLowerCase() && !item.location.toLowerCase().includes(city.toLowerCase()))
        return false;
>>>>>>> redux-migration
      if (q && !item.title.toLowerCase().includes(q) && !item.location.toLowerCase().includes(q)) return false;
      if (filters.price !== 'all') {
        const [min, max] = filters.price.split('-').map(Number);
        if (item.price < min) return false;
        if (max && item.price > max) return false;
      }
      if (filters.gender.length && !filters.gender.some((g) => g === item.gender || item.gender === 'unisex')) return false;
      if (filters.room.length && !filters.room.some((r) => item.roomTypes.includes(r.toLowerCase()))) return false;
      if (filters.food.length && !filters.food.some((f) => item.food === f || (f === 'vegonly' && item.food === 'food'))) return false;
<<<<<<< HEAD
      if (filters.amenity.length && !filters.amenity.every((a) => item.amenities.some((x) => x.includes(a)))) return false;
      if (filters.rating !== 'all' && item.rating < parseFloat(filters.rating)) return false;
=======
      // Amenities are canonical keys (see utils/normalize), so match exactly: 'ac' must not match 'backup'.
      if (filters.amenity.length && !filters.amenity.every((a) => item.amenities.includes(a))) return false;
      if (filters.availableOnly && !item.hasAvailableRooms) return false;
>>>>>>> redux-migration
      return true;
    });
    const sorted = [...result];
    if (filters.sort === 'low') sorted.sort((a, b) => a.price - b.price);
    else if (filters.sort === 'high') sorted.sort((a, b) => b.price - a.price);
<<<<<<< HEAD
    else if (filters.sort === 'rating') sorted.sort((a, b) => b.rating - a.rating);
=======
    else if (filters.sort === 'beds') sorted.sort((a, b) => b.freeBeds - a.freeBeds || a.price - b.price);
>>>>>>> redux-migration
    return sorted;
  },
);

export const selectActiveFilterCount = createSelector([selectFilters], (f) => {
  let count = 0;
  if (f.price !== 'all') count++;
<<<<<<< HEAD
  if (f.rating !== 'all') count++;
=======
  if (f.availableOnly) count++;
>>>>>>> redux-migration
  return count + f.gender.length + f.room.length + f.food.length + f.amenity.length;
});

export const selectListingDetail = createSelector([(s) => s.listings.detail], (detail) => ({
  ...detail,
  listing: detail.property ? mapProperty(detail.property, detail.rooms) : null,
}));
