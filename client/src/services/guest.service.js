import api from "./axios";

const unwrap = (response) => response.data;

const guestService = {
  getDashboard: async () => unwrap(await api.get("/api/guest/dashboard")),
  getRecommendations: async () => unwrap(await api.get("/api/guest/recommendations")),
  createTripPlan: async (payload) => unwrap(await api.post("/api/guest/trip-planner", payload)),
  getPriceAlerts: async () => unwrap(await api.get("/api/guest/price-alerts")),
  createPriceAlert: async (payload) => unwrap(await api.post("/api/guest/price-alerts", payload)),
  removePriceAlert: async (alertId) => unwrap(await api.delete(`/api/guest/price-alerts/${alertId}`)),
};

export default guestService;