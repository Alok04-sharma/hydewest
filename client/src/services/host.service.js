import api from "./axios";
const hostService = {
  getDashboard: async () => (await api.get("/api/host/dashboard")).data,
  getListings: async () => (await api.get("/api/host/apartments")).data,
  getBookings: async (params = {}) => (await api.get("/api/host/bookings", { params })).data,
  getBookingDetails: async (id) => (await api.get(`/api/host/bookings/${id}`)).data,
  updateBookingStatus: async (id, payload) => (await api.patch(`/api/host/bookings/${id}/status`, payload)).data,
  getAvailability: async (params = {}) => (await api.get("/api/host/availability", { params })).data,
  getRevenue: async () => (await api.get("/api/host/revenue")).data,
};
export { hostService };
export default hostService;