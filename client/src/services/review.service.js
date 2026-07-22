import axiosInstance from './axios';
import { API_ENDPOINTS } from '../constants/api';

export const reviewService = {
  getApartmentReviews: (apartmentId) => {
    return axiosInstance.get(API_ENDPOINTS.REVIEWS.BY_APARTMENT(apartmentId));
  },

  addReview: (reviewData) => {
    return axiosInstance.post(API_ENDPOINTS.REVIEWS.BASE, reviewData);
  },
};