import api from "./axios";

const fileNameFromHeader = (value, fallback) => {
  const utf = value?.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf?.[1]) return decodeURIComponent(utf[1]);
  const regular = value?.match(/filename="?([^";]+)"?/i);
  return regular?.[1] || fallback;
};

const guestMembershipService = {
  getPlans: async () => (await api.get("/api/guest/membership/plans")).data,
  getMyMembership: async () => (await api.get("/api/guest/membership")).data,
  getPayments: async () => (await api.get("/api/guest/membership/payments")).data,
  createOrder: async (planCode) => (await api.post("/api/guest/membership/create-order", { planCode })).data,
  verifyPayment: async (payload) => (await api.post("/api/guest/membership/verify-payment", payload)).data,
  downloadInvoice: async (paymentId) => {
    const response = await api.get(`/api/guest/membership/payments/${paymentId}/invoice`, { responseType: "blob" });
    return {
      blob: response.data,
      fileName: fileNameFromHeader(response.headers?.["content-disposition"], `StayNest-Premium-${paymentId}.pdf`),
    };
  },
};

export default guestMembershipService;