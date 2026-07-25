import api from "./axios";

export const wishlistService = {
  getWishlist: async () => (await api.get("/api/wishlist")).data,
  addToWishlist: async (apartmentId) => (await api.post("/api/wishlist", { apartmentId })).data,
  removeFromWishlist: async (apartmentId) => (await api.delete(`/api/wishlist/${apartmentId}`)).data,
};

export default wishlistService;