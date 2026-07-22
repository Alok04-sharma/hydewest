import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { wishlistService } from '../../services/wishlist.service';

export const fetchWishlistThunk = createAsyncThunk(
  'wishlist/fetchWishlist',
  async (_, { rejectWithValue }) => {
    try {
      return await wishlistService.getWishlist();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const addToWishlistThunk = createAsyncThunk(
  'wishlist/addToWishlist',
  async (apartmentId, { rejectWithValue }) => {
    try {
      return await wishlistService.addToWishlist(apartmentId);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const removeFromWishlistThunk = createAsyncThunk(
  'wishlist/removeFromWishlist',
  async (apartmentId, { rejectWithValue }) => {
    try {
      await wishlistService.removeFromWishlist(apartmentId);
      return apartmentId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Wishlist
      .addCase(fetchWishlistThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchWishlistThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data || action.payload.wishlist || action.payload;
      })
      .addCase(fetchWishlistThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Add to Wishlist
      .addCase(addToWishlistThunk.fulfilled, (state, action) => {
        const item = action.payload.data || action.payload;
        state.items.push(item);
      })
      // Remove from Wishlist
      .addCase(removeFromWishlistThunk.fulfilled, (state, id) => {
        state.items = state.items.filter((item) => (item._id || item.id || item) !== id.payload);
      });
  },
});

export default wishlistSlice.reducer;