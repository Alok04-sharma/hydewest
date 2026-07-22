import api from './axios';

const bookingService = {
  // Guest - Create booking
  createBooking: (bookingData) => {
    return api.post('/api/bookings/create', bookingData);
  },

  // Guest - Get my bookings
  getMyBookings: () => {
    return api.get('/api/bookings/my');
  },

  // Guest - Cancel booking
  cancelBooking: (id) => {
    return api.patch(`/api/bookings/${id}/cancel`);
  },

  // Host - Get guest bookings for host's properties
  getHostBookings: () => {
    return api.get('/api/bookings/host');
  },
};

export default bookingService;