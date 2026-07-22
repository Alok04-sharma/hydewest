import api from './axios';

const authService = {
  register: (userData) => {
    return api.post('/api/auth/register', userData);
  },

  sendOTP: (email) => {
    return api.post('/api/auth/send-otp', { email });
  },

  verifyOTP: (email, otp) => {
    return api.post('/api/auth/verify-otp', { email, otp });
  },

  getProfile: () => {
    return api.get('/api/auth/profile');
  },

  // Profile Edit API Call (Supports Avatar Multipart upload or JSON)
  updateProfile: (profileData) => {
    // If FormData passed (contains avatar file), set multipart header
    if (profileData instanceof FormData) {
      return api.put('/api/auth/profile', profileData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    }
    return api.put('/api/auth/profile', profileData);
  },

  logout: () => {
    return api.post('/api/auth/logout');
  },
};

export default authService;