import api from "./axios";

const unwrap = (response) => response.data;

const reviewService = {
  getApartmentReviews: async (apartmentId) =>
    unwrap(await api.get(`/api/reviews/apartment/${apartmentId}`)),
  getMyReviews: async () => unwrap(await api.get("/api/reviews/me")),
  getEligibleBookings: async () =>
    unwrap(await api.get("/api/reviews/eligible-bookings")),
  addReview: async (apartmentId, payload) =>
    unwrap(await api.post(`/api/reviews/${apartmentId}`, payload)),
  deleteReview: async (reviewId) =>
    unwrap(await api.delete(`/api/reviews/${reviewId}`)),
};

export { reviewService };
export default reviewService;