import axiosInstance from './axios';
import { API_ENDPOINTS } from '../constants/api';

export const wishlistService = {
  getWishlist: () => {
    return axiosInstance.get(API_ENDPOINTS.WISHLIST.BASE);
  },

  addToWishlist: (apartmentId) => {
    return axiosInstance.post(API_ENDPOINTS.WISHLIST.BASE, { apartmentId });
  },

  removeFromWishlist: (apartmentId) => {
    return axiosInstance.delete(API_ENDPOINTS.WISHLIST.ITEM(apartmentId));
  },
};