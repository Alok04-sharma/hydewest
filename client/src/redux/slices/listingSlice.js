import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import listingService from '../../services/listing.service';

const initialState = {
  listings: [],
  selectedListing: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  },
  filters: {
    city: '',
    state: '',
    country: '',
    minPrice: '',
    maxPrice: '',
    guests: '',
    bedrooms: '',
    propertyType: '',
    amenities: '',
    sortBy: 'newest',
  },
  loading: false,
  error: null,
};

// Async Thunk: Fetch All Approved Apartments
export const fetchAllListings = createAsyncThunk(
  'listing/fetchAllListings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await listingService.getAll();
      return response.data.data; // Array of approved apartments
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Apartments load karne mein error aaya.'
      );
    }
  }
);

// Async Thunk: Search / Filter Apartments
export const searchListingsThunk = createAsyncThunk(
  'listing/searchListingsThunk',
  async (queryParams, { rejectWithValue }) => {
    try {
      const response = await listingService.search(queryParams);
      return response.data.data; // Returns { page, limit, total, totalPages, apartments }
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Search filter run karne mein fail ho gaya.'
      );
    }
  }
);

// Async Thunk: Fetch Single Apartment Details
export const fetchListingById = createAsyncThunk(
  'listing/fetchListingById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await listingService.getById(id);
      return response.data.data; // Apartment details object
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Apartment details fetch nahi ho payi.'
      );
    }
  }
);

const listingSlice = createSlice({
  name: 'listing',
  initialState,
  reducers: {
    setFilter: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },
    clearSelectedListing: (state) => {
      state.selectedListing = null;
    },
    clearListingError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch All Listings
      .addCase(fetchAllListings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllListings.fulfilled, (state, action) => {
        state.loading = false;
        state.listings = action.payload || [];
      })
      .addCase(fetchAllListings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Search Listings
      .addCase(searchListingsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchListingsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.listings = action.payload?.apartments || [];
        state.pagination = {
          page: action.payload?.page || 1,
          limit: action.payload?.limit || 10,
          total: action.payload?.total || 0,
          totalPages: action.payload?.totalPages || 1,
        };
      })
      .addCase(searchListingsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Single Listing Details
      .addCase(fetchListingById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchListingById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedListing = action.payload;
      })
      .addCase(fetchListingById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  setFilter,
  resetFilters,
  clearSelectedListing,
  clearListingError,
} = listingSlice.actions;

export default listingSlice.reducer;