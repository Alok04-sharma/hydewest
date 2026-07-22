import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../services/axios';

// Public Listings Fetch
export const fetchApartmentsThunk = createAsyncThunk(
  'apartments/fetchAll',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get('/apartments', { params: filters });
      return res;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || 'Failed to fetch apartments'
      );
    }
  }
);

// Host Specific Listings Fetch
export const fetchHostApartmentsThunk = createAsyncThunk(
  'apartments/fetchHostListings',
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get('/apartments/host');
      return res;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || 'Failed to fetch host listings'
      );
    }
  }
);

// Create Listing
export const createApartmentThunk = createAsyncThunk(
  'apartments/create',
  async (formDataPayload, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post('/apartments/create', formDataPayload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || 'Failed to create listing'
      );
    }
  }
);

const initialState = {
  apartments: [],
  hostApartments: [], // Dedicated state for Host's own properties
  loading: false,
  hostLoading: false,
  createLoading: false,
  error: null,
  createSuccess: false,
  filters: {
    city: '',
    minPrice: '',
    maxPrice: '',
    guests: '',
    propertyType: '',
    sortBy: 'newest',
  },
};

const apartmentSlice = createSlice({
  name: 'apartments',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },
    resetCreateStatus: (state) => {
      state.createSuccess = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch All
      .addCase(fetchApartmentsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchApartmentsThunk.fulfilled, (state, action) => {
        state.loading = false;
        const data = action.payload;
        state.apartments =
          data.apartments || data.listings || data.data || (Array.isArray(data) ? data : []);
      })
      .addCase(fetchApartmentsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Host Listings
      .addCase(fetchHostApartmentsThunk.pending, (state) => {
        state.hostLoading = true;
        state.error = null;
      })
      .addCase(fetchHostApartmentsThunk.fulfilled, (state, action) => {
        state.hostLoading = false;
        const data = action.payload;
        state.hostApartments =
          data.apartments || data.listings || data.data || (Array.isArray(data) ? data : []);
      })
      .addCase(fetchHostApartmentsThunk.rejected, (state, action) => {
        state.hostLoading = false;
        state.error = action.payload;
      })

      // Create Listing
      .addCase(createApartmentThunk.pending, (state) => {
        state.createLoading = true;
        state.error = null;
        state.createSuccess = false;
      })
      .addCase(createApartmentThunk.fulfilled, (state, action) => {
        state.createLoading = false;
        state.createSuccess = true;
        const newApartment =
          action.payload?.apartment || action.payload?.data || action.payload;
        if (newApartment && typeof newApartment === 'object') {
          state.hostApartments.unshift(newApartment);
        }
      })
      .addCase(createApartmentThunk.rejected, (state, action) => {
        state.createLoading = false;
        state.error = action.payload;
        state.createSuccess = false;
      });
  },
});

export const { setFilters, resetFilters, resetCreateStatus } = apartmentSlice.actions;
export default apartmentSlice.reducer;