import api from "./axios";

const getFileNameFromDisposition = (disposition, fallbackName) => {
  if (!disposition) {
    return fallbackName;
  }

  const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1]);
  }

  const regularMatch = disposition.match(/filename="?([^";]+)"?/i);
  return regularMatch?.[1] || fallbackName;
};

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

  downloadInvoice: async (paymentId) => {
    const response = await api.get(
      `/api/subscriptions/my/payments/${paymentId}/invoice`,
      {
        responseType: "blob",
      }
    );

    return {
      blob: response.data,
      fileName: getFileNameFromDisposition(
        response.headers?.["content-disposition"],
        `StayNest-Invoice-${paymentId}.pdf`
      ),
    };
  },
};

export default subscriptionService;