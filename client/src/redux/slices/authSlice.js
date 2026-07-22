import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import authService from "../../services/auth.service";
import { APP_CONFIG } from "../../constants/app";

const tokenFromStorage = localStorage.getItem(APP_CONFIG.TOKEN_KEY);
const otpEmailFromStorage = sessionStorage.getItem("login_email");

const initialState = {
  user: null,
  token: tokenFromStorage || null,
  isAuthenticated: Boolean(tokenFromStorage),
  otpSentEmail: otpEmailFromStorage || null,
  loading: false,
  error: null,
  successMessage: null,
};

const getErrorMessage = (error, fallbackMessage) => {
  return error.response?.data?.message || error.message || fallbackMessage;
};

// Register User
export const registerUser = createAsyncThunk(
  "auth/registerUser",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await authService.register(userData);
      const authData = response.data?.data;

      if (!authData?.token || !authData?.user) {
        return rejectWithValue("Backend se valid user data nahi mila.");
      }

      localStorage.setItem(APP_CONFIG.TOKEN_KEY, authData.token);

      return {
        token: authData.token,
        user: authData.user,
        message: response.data?.message,
      };
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Signup karne mein dikkat aayi.")
      );
    }
  }
);

// Send Login OTP
export const sendOTP = createAsyncThunk(
  "auth/sendOTP",
  async (email, { rejectWithValue }) => {
    try {
      const normalizedEmail = String(email).trim().toLowerCase();
      const response = await authService.sendOTP(normalizedEmail);

      // Email ko tabhi save karo jab backend ne OTP successfully send kar diya ho.
      sessionStorage.setItem("login_email", normalizedEmail);

      return {
        email: normalizedEmail,
        message: response.data?.message,
      };
    } catch (error) {
      sessionStorage.removeItem("login_email");

      return rejectWithValue(
        getErrorMessage(error, "OTP bhejne mein error aaya.")
      );
    }
  }
);

// Verify OTP and Login
export const verifyOTP = createAsyncThunk(
  "auth/verifyOTP",
  async ({ email, otp }, { rejectWithValue }) => {
    try {
      const normalizedEmail = String(email).trim().toLowerCase();
      const normalizedOTP = String(otp).trim();

      const response = await authService.verifyOTP(
        normalizedEmail,
        normalizedOTP
      );

      const authData = response.data?.data;

      if (!authData?.token || !authData?.user) {
        return rejectWithValue("Backend se valid login data nahi mila.");
      }

      localStorage.setItem(APP_CONFIG.TOKEN_KEY, authData.token);
      sessionStorage.removeItem("login_email");

      return {
        token: authData.token,
        user: authData.user,
        message: response.data?.message,
      };
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Sahi OTP enter karein.")
      );
    }
  }
);

// Fetch Logged-in User Profile
export const fetchUserProfile = createAsyncThunk(
  "auth/fetchUserProfile",
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.getProfile();
      return response.data?.data;
    } catch (error) {
      localStorage.removeItem(APP_CONFIG.TOKEN_KEY);

      return rejectWithValue(
        getErrorMessage(error, "Profile fetch nahi ho saki.")
      );
    }
  }
);

// Update User Profile
export const updateProfileThunk = createAsyncThunk(
  "auth/updateProfileThunk",
  async (profilePayload, { rejectWithValue }) => {
    try {
      const response = await authService.updateProfile(profilePayload);
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Profile update nahi ho saki.")
      );
    }
  }
);

// Logout
export const logoutUser = createAsyncThunk("auth/logoutUser", async () => {
  try {
    await authService.logout();
  } catch {
    // JWT logout stateless hai, isliye API fail hone par bhi local cleanup hoga.
  } finally {
    localStorage.removeItem(APP_CONFIG.TOKEN_KEY);
    sessionStorage.removeItem("login_email");
  }

  return true;
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuthMessages: (state) => {
      state.error = null;
      state.successMessage = null;
    },
    setOtpEmail: (state, action) => {
      const email = String(action.payload || "").trim().toLowerCase();

      state.otpSentEmail = email || null;

      if (email) {
        sessionStorage.setItem("login_email", email);
      } else {
        sessionStorage.removeItem("login_email");
      }
    },
    clearOtpEmail: (state) => {
      state.otpSentEmail = null;
      sessionStorage.removeItem("login_email");
    },
  },
  extraReducers: (builder) => {
    builder
      // Register
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.successMessage = action.payload.message;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Send OTP
      .addCase(sendOTP.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
        state.otpSentEmail = null;
      })
      .addCase(sendOTP.fulfilled, (state, action) => {
        state.loading = false;
        state.otpSentEmail = action.payload.email;
        state.successMessage = action.payload.message;
      })
      .addCase(sendOTP.rejected, (state, action) => {
        state.loading = false;
        state.otpSentEmail = null;
        state.error = action.payload;
      })

      // Verify OTP
      .addCase(verifyOTP.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(verifyOTP.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.otpSentEmail = null;
        state.successMessage = action.payload.message;
      })
      .addCase(verifyOTP.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Profile
      .addCase(fetchUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = action.payload;
      })

      // Update Profile
      .addCase(updateProfileThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(updateProfileThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.successMessage = "Profile updated successfully!";
      })
      .addCase(updateProfileThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Logout
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.otpSentEmail = null;
        state.error = null;
        state.successMessage = null;
      });
  },
});

export const { clearAuthMessages, setOtpEmail, clearOtpEmail } =
  authSlice.actions;

export default authSlice.reducer;
