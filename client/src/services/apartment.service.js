import axios from './axios';

export const apartmentService = {
  // 1. Fetch All Approved Apartments (Public Home Page)
  getAllApartments: async () => {
    const response = await axios.get('/apartments');
    return response.data || response;
  },

  // 2. Advanced Search & Filter
  searchApartments: async (queryParams = {}) => {
    // Convert params object to URL search params
    const params = new URLSearchParams();

    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });

    const response = await axios.get(`/apartments/search?${params.toString()}`);
    return response.data || response;
  },

  // 3. Get Single Apartment Details by ID
  getApartmentDetails: async (id) => {
    const response = await axios.get(`/apartments/${id}`);
    return response.data || response;
  },

  // 4. Get Host's Own Properties (Protected)
  getHostApartments: async () => {
    const response = await axios.get('/apartments/host/my');
    return response.data || response;
  },

  // 5. Create Apartment (Host only, FormData for images upload)
  createApartment: async (formData) => {
    const response = await axios.post('/apartments/create', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data || response;
  },

  // 6. Update Apartment
  updateApartment: async (id, updateData) => {
    const response = await axios.put(`/apartments/${id}`, updateData);
    return response.data || response;
  },

  // 7. Delete Apartment
  deleteApartment: async (id) => {
    const response = await axios.delete(`/apartments/${id}`);
    return response.data || response;
  },
};