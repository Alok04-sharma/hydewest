import api from "./axios";

const loyaltyService = {
  getMyLoyalty: async (params = {}) => (await api.get("/api/guest/loyalty", { params })).data,
};

export default loyaltyService;