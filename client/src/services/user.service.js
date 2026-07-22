import api from './axios';

const userService = {
  // Host Dashboard Stats (/api/host/dashboard)
  getHostStats: () => {
    return api.get('/api/host/dashboard');
  },

  // Owner / Super Admin Endpoints (/api/owner/...)
  getPendingApartments: () => {
    return api.get('/api/owner/apartments/pending');
  },

  getOwnerApartmentDetails: (id) => {
    return api.get(`/api/owner/apartments/${id}`);
  },

  approveApartment: (id) => {
    return api.patch(`/api/owner/apartments/${id}/approve`);
  },

  rejectApartment: (id) => {
    return api.patch(`/api/owner/apartments/${id}/reject`);
  },
};

export default userService;