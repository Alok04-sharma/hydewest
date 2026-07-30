import api from "./axios";

const ownerService = {
  // Super Admin Dashboard
  getDashboard: async () => {
    const response = await api.get("/api/owner/dashboard");
    return response.data;
  },

  getRevenueAnalytics: async () => {
    const response = await api.get("/api/owner/analytics/revenue");
    return response.data;
  },

  getSearchAnalytics: async (params = {}) => {
    const response = await api.get("/api/owner/analytics/search", { params });
    return response.data;
  },

  // Guest Management
  getGuests: async (params = {}) => {
    const response = await api.get("/api/owner/guests", { params });
    return response.data;
  },

  // Host Management
  getHosts: async (params = {}) => {
    const response = await api.get("/api/owner/hosts", { params });
    return response.data;
  },

  getHostProfile: async (hostId) => {
    const response = await api.get(`/api/owner/hosts/${hostId}`);
    return response.data;
  },

  suspendHost: async (hostId, reason) => {
    const response = await api.patch(`/api/owner/hosts/${hostId}/suspend`, {
      reason,
    });
    return response.data;
  },

  removeHost: async (hostId, reason) => {
    const response = await api.delete(`/api/owner/hosts/${hostId}`, {
      data: { reason },
    });
    return response.data;
  },

  // Listing Management
  getListings: async (params = {}) => {
    const response = await api.get("/api/owner/listings", { params });
    return response.data;
  },

  getListingDetails: async (listingId) => {
    const response = await api.get(`/api/owner/listings/${listingId}`);
    return response.data;
  },

  approveListing: async (listingId, note = "") => {
    const response = await api.patch(
      `/api/owner/listings/${listingId}/approve`,
      { note }
    );
    return response.data;
  },

  suspendListing: async (listingId, reason) => {
    const response = await api.patch(
      `/api/owner/listings/${listingId}/suspend`,
      { reason }
    );
    return response.data;
  },

  removeListing: async (listingId, reason) => {
    const response = await api.delete(`/api/owner/listings/${listingId}`, {
      data: { reason },
    });
    return response.data;
  },

  // Booking Monitoring
  getBookings: async (params = {}) => {
    const response = await api.get("/api/owner/bookings", { params });
    return response.data;
  },

  getBookingDetails: async (bookingId) => {
    const response = await api.get(`/api/owner/bookings/${bookingId}`);
    return response.data;
  },

  // Subscription Management
  getSubscriptions: async (params = {}) => {
    const response = await api.get("/api/owner/subscriptions", { params });
    return response.data;
  },

  getSubscriptionDetails: async (subscriptionId) => {
    const response = await api.get(
      `/api/owner/subscriptions/${subscriptionId}`
    );
    return response.data;
  },

  getSubscriptionPayments: async (params = {}) => {
    const response = await api.get("/api/owner/subscriptions/payments", {
      params,
    });
    return response.data;
  },

  // Legacy Property Approval APIs
  getPendingApartments: async () => {
    const response = await api.get("/api/owner/apartments/pending");
    return response.data;
  },

  getApartmentDetails: async (id) => {
    const response = await api.get(`/api/owner/apartments/${id}`);
    return response.data;
  },

  approveApartment: async (id) => {
    const response = await api.patch(`/api/owner/apartments/${id}/approve`);
    return response.data;
  },

  rejectApartment: async (id, reason = "") => {
    const response = await api.patch(`/api/owner/apartments/${id}/reject`, {
      reason,
    });
    return response.data;
  },
};

export { ownerService };
export default ownerService;