import api from "./axios";

const ownerService = {
  // ======================================
  // Super Admin Dashboard
  // ======================================

  getDashboard: async () => {
    const response = await api.get(
      "/api/owner/dashboard"
    );

    return response.data;
  },

  // ======================================
  // Property Approval APIs
  // Existing methods preserved
  // ======================================

  getPendingApartments: async () => {
    const response = await api.get(
      "/api/owner/apartments/pending"
    );

    return response.data;
  },

  getApartmentDetails: async (id) => {
    const response = await api.get(
      `/api/owner/apartments/${id}`
    );

    return response.data;
  },

  approveApartment: async (id) => {
    const response = await api.patch(
      `/api/owner/apartments/${id}/approve`
    );

    return response.data;
  },

  rejectApartment: async (
    id,
    reason = ""
  ) => {
    const response = await api.patch(
      `/api/owner/apartments/${id}/reject`,
      {
        reason,
      }
    );

    return response.data;
  },
};

export {
  ownerService,
};

export default ownerService;