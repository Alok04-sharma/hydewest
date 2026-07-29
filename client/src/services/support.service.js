import api from "./axios";
const unwrap = (response) => response.data;
const supportService = {
  getMine: async () => unwrap(await api.get("/api/support/my")),
  create: async (payload) => unwrap(await api.post("/api/support", payload)),
  getAdminTickets: async (params = {}) => unwrap(await api.get("/api/support/admin", { params })),
  updateAdminTicket: async (ticketId, payload) => unwrap(await api.patch(`/api/support/admin/${ticketId}`, payload)),
};
export default supportService;