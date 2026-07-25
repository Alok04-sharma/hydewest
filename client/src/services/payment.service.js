import api from "./axios";

const fileNameFromHeader = (value, fallback) => {
  const utf = value?.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf?.[1]) return decodeURIComponent(utf[1]);
  const regular = value?.match(/filename="?([^";]+)"?/i);
  return regular?.[1] || fallback;
};

const paymentService = {
  createOrder: async (bookingId) => (await api.post("/api/payments/create", { bookingId })).data,
  verify: async (payload) => (await api.post("/api/payments/verify", payload)).data,
  getHistory: async () => (await api.get("/api/payments/history")).data,
  downloadReceipt: async (paymentId) => {
    const response = await api.get(`/api/payments/${paymentId}/receipt`, { responseType: "blob" });
    return {
      blob: response.data,
      fileName: fileNameFromHeader(response.headers?.["content-disposition"], `StayNest-Receipt-${paymentId}.pdf`),
    };
  },
};

export default paymentService;