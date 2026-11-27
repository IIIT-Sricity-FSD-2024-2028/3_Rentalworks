import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { buildFaqs } from '../../data/faqs';
import { http, asArray } from '../../services/apiClient';
import { withNormalizedStatus } from '../../utils/normalize';
import { mapProperty, isPublicProperty } from './listingMappers';
import { propertiesRepo, roomsRepo } from '../repositories';

// =====================================================================
//  Public catalogue
//  The data lives in the properties and rooms repository slices (the same
//  slices the owner and admin portals use). This slice only holds what the
//  listing pages need on top: filters, search, city, the filter panel and
//  which property the details page is showing.
// =====================================================================

export const INITIAL_FILTERS = {
  sort: 'low',
  price: 'all',
  room: [],
  gender: [],
  food: [],
  amenity: [],
  availableOnly: false,
};

export const CITIES = ['All', 'Chennai', 'Bangalore', 'Mumbai', 'Pune', 'Hyderabad'];

// ------------------------------------------------------------------ thunks

/** Load the catalogue into the properties + rooms repositories. */
export const fetchListings = createAsyncThunk(
  'listings/fetchListings',
  async (_, { dispatch, rejectWithValue }) => {
    const [props] = await Promise.all([dispatch(propertiesRepo.thunks.fetchAll()), dispatch(roomsRepo.thunks.fetchAll())]);
    if (props.error) return rejectWithValue(props.payload || 'Could not load listings');
    return true;
  },
  {
    // Don't refetch while a request is in flight.
    condition: (_, { getState }) => getState().properties.status !== 'loading',
  },
);

/** Details page: refresh one property and its rooms inside the repositories. */
export const fetchListingById = createAsyncThunk('listings/fetchListingById', async (id, { dispatch, rejectWithValue }) => {
  try {
    const [prop, rooms] = await Promise.all([http.get(`/properties/${id}`), http.get(`/rooms?propertyId=${encodeURIComponent(id)}`).catch(() => [])]);
    dispatch(propertiesRepo.actions.upsertItem(withNormalizedStatus(prop)));
    asArray(rooms).forEach((r) => dispatch(roomsRepo.actions.upsertItem(withNormalizedStatus(r))));
    return true;
  } catch (err) {
    return rejectWithValue(err.status === 404 ? 'This property could not be found.' : err.message);
  }
});

// ------------------------------------------------------------------ slice

const listingsSlice = createSlice({
  name: 'listings',
  initialState: {
    detail: { id: null, status: 'idle', error: null },
    filters: INITIAL_FILTERS,
    search: '',
    city: 'All',
    filterPanelOpen: false,
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
      .addCase(fetchListingById.pending, (state, { meta }) => {
        const same = String(state.detail.id) === String(meta.arg) && state.detail.status === 'succeeded';
        state.detail = { id: meta.arg, status: same ? 'succeeded' : 'loading', error: null };
      })
      .addCase(fetchListingById.fulfilled, (state, { meta }) => {
        if (String(state.detail.id) === String(meta.arg)) state.detail.status = 'succeeded';
      })
      .addCase(fetchListingById.rejected, (state, { payload, meta }) => {
        if (String(state.detail.id) !== String(meta.arg)) return;
        state.detail.status = 'failed';
        state.detail.error = payload;
      });
  },
});

export const { setFilter, toggleFilterValue, resetFilters, setSearch, setCity, setFilterPanelOpen } = listingsSlice.actions;
export default listingsSlice.reducer;

// ------------------------------------------------------------------ selectors

const selectProperties = propertiesRepo.selectors.selectItems;
const selectRooms = roomsRepo.selectors.selectItems;

// A background refresh (data already on screen) keeps showing the old data
// instead of a spinner; `refreshing` tells the UI a refresh is running.
export const selectListingsStatus = (state) => {
  const { status, items } = state.properties;
  return status === 'loading' && items.length ? 'succeeded' : status;
};
export const selectListingsError = (state) => (state.properties.items.length ? null : state.properties.error);
export const selectListingsRefreshing = (state) => state.properties.status === 'loading' && state.properties.items.length > 0;
export const selectListingsUpdatedAt = (state) => state.properties.lastFetched;
export const selectFilters = (state) => state.listings.filters;
export const selectSearch = (state) => state.listings.search;
export const selectCity = (state) => state.listings.city;
export const selectFilterPanelOpen = (state) => state.listings.filterPanelOpen;

const roomsOf = (rooms, id) => rooms.filter((r) => String(r.propertyId ?? r.property?.id) === String(id));

/** Approved properties only, whoever is signed in. */
export const selectAllListings = createSelector([selectProperties, selectRooms], (properties, rooms) =>
  properties.filter(isPublicProperty).map((p, idx) => mapProperty(p, roomsOf(rooms, p.id), idx)),
);

/** Cities that actually have listings, plus the defaults so the picker never looks empty. */
export const selectCities = createSelector([selectAllListings], (listings) => {
  const fromData = listings.map((l) => l.city).filter(Boolean);
  return ['All', ...new Set([...CITIES.slice(1), ...fromData])];
});

export const selectFilteredListings = createSelector([selectAllListings, selectFilters, selectSearch, selectCity], (listings, filters, search, city) => {
  const q = search.trim().toLowerCase();
  const result = listings.filter((item) => {
    if (city !== 'All' && item.city.toLowerCase() !== city.toLowerCase() && !item.location.toLowerCase().includes(city.toLowerCase())) return false;
    if (q && !item.title.toLowerCase().includes(q) && !item.location.toLowerCase().includes(q)) return false;
    if (filters.price !== 'all') {
      const [min, max] = filters.price.split('-').map(Number);
      if (item.price < min) return false;
      if (max && item.price > max) return false;
    }
    if (filters.gender.length && !filters.gender.some((g) => g === item.gender || item.gender === 'unisex')) return false;
    if (filters.room.length && !filters.room.some((r) => item.roomTypes.includes(r.toLowerCase()))) return false;
    if (filters.food.length && !filters.food.some((f) => item.food === f || (f === 'vegonly' && item.food === 'food'))) return false;
    // Amenities are canonical keys (see utils/normalize), so match exactly: 'ac' must not match 'backup'.
    if (filters.amenity.length && !filters.amenity.every((a) => item.amenities.includes(a))) return false;
    if (filters.availableOnly && !item.hasAvailableRooms) return false;
    return true;
  });
  const sorted = [...result];
  if (filters.sort === 'low') sorted.sort((a, b) => a.price - b.price);
  else if (filters.sort === 'high') sorted.sort((a, b) => b.price - a.price);
  else if (filters.sort === 'beds') sorted.sort((a, b) => b.freeBeds - a.freeBeds || a.price - b.price);
  return sorted;
});

export const selectActiveFilterCount = createSelector([selectFilters], (f) => {
  let count = 0;
  if (f.price !== 'all') count++;
  if (f.availableOnly) count++;
  return count + f.gender.length + f.room.length + f.food.length + f.amenity.length;
});

/** Details page: the property from the repository (owners may preview their pending one). */
export const selectListingDetail = createSelector([(s) => s.listings.detail, selectProperties, selectRooms], (detail, properties, rooms) => {
  const property = properties.find((p) => String(p.id) === String(detail.id)) || null;
  return {
    ...detail,
    property,
    rooms: property ? roomsOf(rooms, property.id) : [],
    listing: property ? mapProperty(property, roomsOf(rooms, property.id)) : null,
  };
});

// Derive FAQs from the same listing data shown elsewhere on the page.
export const selectListingFaqs = createSelector([selectListingDetail], ({ listing }) => buildFaqs(listing));
