import api from "./axios";
const chatService = {
  startConversation: async (apartmentId) => (await api.post("/api/chat/conversations", { apartmentId })).data,
  getConversations: async () => (await api.get("/api/chat/conversations")).data,
  getMessages: async (conversationId) => (await api.get(`/api/chat/conversations/${conversationId}/messages`)).data,
  sendMessage: async (conversationId, text) => (await api.post(`/api/chat/conversations/${conversationId}/messages`, { text })).data,
};
export default chatService;