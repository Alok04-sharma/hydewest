import api from "./axios";

const subscriptionService = {
  getPlans: async () => {
    const response = await api.get("/api/subscriptions/plans");
    return response.data;
  },

  getMySubscription: async () => {
    const response = await api.get("/api/subscriptions/my");
    return response.data;
  },

  getMyPayments: async () => {
    const response = await api.get("/api/subscriptions/my/payments");
    return response.data;
  },

  createOrder: async (planCode) => {
    const response = await api.post("/api/subscriptions/create-order", {
      planCode,
    });
    return response.data;
  },

  verifyPayment: async (paymentData) => {
    const response = await api.post(
      "/api/subscriptions/verify-payment",
      paymentData
    );
    return response.data;
  },
};

export default subscriptionService;
