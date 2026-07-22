import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { bookingService } from '../../services/booking.service';

export const createBookingThunk = createAsyncThunk(
  'booking/createBooking',
  async (bookingData, { rejectWithValue }) => {
    try {
      return await bookingService.createBooking(bookingData);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchGuestTripsThunk = createAsyncThunk(
  'booking/fetchGuestTrips',
  async (_, { rejectWithValue }) => {
    try {
      return await bookingService.getGuestTrips();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const bookingSlice = createSlice({
  name: 'booking',
  initialState: {
    activeBooking: null,
    trips: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearActiveBooking: (state) => {
      state.activeBooking = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create Booking
      .addCase(createBookingThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBookingThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.activeBooking = action.payload.data || action.payload.booking || action.payload;
      })
      .addCase(createBookingThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Guest Trips
      .addCase(fetchGuestTripsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGuestTripsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.trips = action.payload.data || action.payload.bookings || action.payload;
      })
      .addCase(fetchGuestTripsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearActiveBooking } = bookingSlice.actions;
export default bookingSlice.reducer;