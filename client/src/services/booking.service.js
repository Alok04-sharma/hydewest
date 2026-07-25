import api from "./axios";

const bookingService = {
  getQuote: async (payload) => (await api.post("/api/bookings/quote", payload)).data,
  createBooking: async (payload) => (await api.post("/api/bookings/create", payload)).data,
  getMyBookings: async () => (await api.get("/api/bookings/my")).data,
  getMyBookingDetails: async (id) => (await api.get(`/api/bookings/my/${id}`)).data,
  cancelBooking: async (id, reason = "") => (await api.patch(`/api/bookings/${id}/cancel`, { reason })).data,
  getHostBookings: async () => (await api.get("/api/bookings/host")).data,
};

export default bookingService;
export { bookingService };