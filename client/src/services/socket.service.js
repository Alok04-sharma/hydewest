import { io } from "socket.io-client";
import { APP_CONFIG } from "../constants/app";
let socket;
export const getSocket = () => {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
      autoConnect: false,
      auth: { token: localStorage.getItem(APP_CONFIG.TOKEN_KEY) },
    });
  }
  socket.auth = { token: localStorage.getItem(APP_CONFIG.TOKEN_KEY) };
  return socket;
};
export const disconnectSocket = () => socket?.disconnect();
