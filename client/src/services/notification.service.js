import api from "./axios";

const notificationService = {
  getNotifications: async (params = {}) => {
    const response = await api.get("/api/notifications", { params });
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get("/api/notifications/unread-count");
    return response.data;
  },

  markRead: async (notificationId) => {
    const response = await api.patch(
      `/api/notifications/${notificationId}/read`
    );
    return response.data;
  },

  markAllRead: async () => {
    const response = await api.patch("/api/notifications/read-all");
    return response.data;
  },

  remove: async (notificationId) => {
    const response = await api.delete(
      `/api/notifications/${notificationId}`
    );
    return response.data;
  },
};

export default notificationService;