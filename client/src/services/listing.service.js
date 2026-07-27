import api from "./axios";

const unwrap = (response) => response.data;

const listingService = {
  getAll: async () => unwrap(await api.get("/api/apartments")),
  search: async (params = {}) => unwrap(await api.get("/api/apartments/search", { params })),
  getPublicById: async (id) => unwrap(await api.get(`/api/apartments/${id}`)),
  getMine: async () => unwrap(await api.get("/api/apartments/host/my")),
  getMineById: async (id) => unwrap(await api.get(`/api/apartments/host/${id}`)),
  create: async (formData) =>
    unwrap(
      await api.post("/api/apartments/create", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    ),
  update: async (id, formData) =>
    unwrap(
      await api.put(`/api/apartments/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    ),
  remove: async (id) => unwrap(await api.delete(`/api/apartments/${id}`)),
  quote: async (id, payload) => unwrap(await api.post(`/api/apartments/${id}/quote`, payload)),
  generateNameSuggestions: async (payload) =>
    unwrap(await api.post("/api/apartments/ai/name-suggestions", payload)),
  improveDescription: async (payload) =>
    unwrap(await api.post("/api/apartments/ai/improve-description", payload)),

  // Backward-compatible aliases for existing Redux/pages.
  getById: async (id) => unwrap(await api.get(`/api/apartments/${id}`)),
  getHostApartments: async () => unwrap(await api.get("/api/apartments/host/my")),
  createApartment: async (formData) =>
    unwrap(
      await api.post("/api/apartments/create", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    ),
  updateApartment: async (id, formData) =>
    unwrap(
      await api.put(`/api/apartments/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    ),
  delete: async (id) => unwrap(await api.delete(`/api/apartments/${id}`)),
};

export default listingService;