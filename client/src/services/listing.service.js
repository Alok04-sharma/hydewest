import api from './axios';

const listingService = {
  // Public: Get all approved apartments
  getAll: () => {
    return api.get('/api/apartments');
  },

  // Public: Search & Filter
  search: (queryParams) => {
    return api.get('/api/apartments/search', { params: queryParams });
  },

  // Public: Get Single Apartment Details
  getById: (id) => {
    return api.get(`/api/apartments/${id}`);
  },

  // Host: Get Host's own apartments (FIXED PATH to match backend host.routes.js)
  getHostApartments: () => {
    return api.get('/api/host/apartments');
  },

  // Host: Create Apartment (Multipart FormData)
  create: (formData) => {
    return api.post('/api/apartments/create', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Host: Update Apartment
  update: (id, updateData) => {
    return api.put(`/api/apartments/${id}`, updateData);
  },

  // Host: Delete Apartment
  delete: (id) => {
    return api.delete(`/api/apartments/${id}`);
  },
};

export default listingService;