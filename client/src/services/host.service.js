import axiosInstance from './axios';
import { API_ENDPOINTS } from '../constants/api';

export const hostService = {
  getHostDashboard: () => {
    return axiosInstance.get(API_ENDPOINTS.HOST.DASHBOARD);
  },

  updateBookingStatus: (bookingId, status) => {
    return axiosInstance.patch(API_ENDPOINTS.HOST.UPDATE_BOOKING_STATUS(bookingId), { status });
  },
};