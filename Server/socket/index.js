const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

const initializeSocket = (httpServer, app) => {
  const io = new Server(httpServer, { cors: { origin: process.env.CLIENT_URL || true, credentials: true } });
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required"));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.id || payload._id || payload.userId).select("_id role isHost");
      if (!user) return next(new Error("User not found"));
      socket.user = user;
      return next();
    } catch (error) {
      return next(new Error("Invalid socket token"));
    }
  });
  io.on("connection", (socket) => {
    socket.join(`user:${socket.user._id}`);
    socket.on("chat:join", (conversationId) => socket.join(`conversation:${conversationId}`));
    socket.on("chat:leave", (conversationId) => socket.leave(`conversation:${conversationId}`));
  });
  app.set("io", io);
  return io;
};
module.exports = { initializeSocket };
