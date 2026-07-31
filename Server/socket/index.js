const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const Conversation = require("../models/conversation.model");
const USER_STATUS = require("../constants/userStatus");
const { corsOrigin } = require("../config/cors");

const initializeSocket = (httpServer, app) => {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      credentials: true,
      methods: ["GET", "POST"],
    },
    maxHttpBufferSize: 1e6,
    pingTimeout: 20000,
    pingInterval: 25000,
  });

  io.use(async (socket, next) => {
    try {
      const token = String(socket.handshake.auth?.token || "").trim();

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const payload = jwt.verify(token, process.env.JWT_SECRET, {
        issuer: process.env.JWT_ISSUER || "hydewest-api",
        audience: process.env.JWT_AUDIENCE || "hydewest-client",
        algorithms: ["HS256"],
      });

      if (String(payload.sub || payload.id) !== String(payload.id)) {
        return next(new Error("Invalid socket session"));
      }

      const user = await User.findOne({
        _id: payload.id,
        isDeleted: { $ne: true },
        isVerified: true,
        status: { $nin: [USER_STATUS.REMOVED, USER_STATUS.SUSPENDED, USER_STATUS.BLOCKED] },
      }).select("+tokenVersion _id role isHost status");

      if (
        !user ||
        Number(payload.tokenVersion || 0) !== Number(user.tokenVersion || 0)
      ) {
        return next(new Error("Invalid socket session"));
      }

      user.tokenVersion = undefined;
      socket.user = user;
      return next();
    } catch {
      return next(new Error("Invalid socket token"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user._id}`);

    socket.on("chat:join", async (conversationId, acknowledge = () => {}) => {
      try {
        const conversation = await Conversation.findOne({
          _id: conversationId,
          isDeleted: false,
          $or: [{ guest: socket.user._id }, { host: socket.user._id }],
        }).select("_id");

        if (!conversation) {
          return acknowledge({ success: false, message: "Conversation not found." });
        }

        socket.join(`conversation:${conversation._id}`);
        return acknowledge({ success: true });
      } catch {
        return acknowledge({ success: false, message: "Unable to join conversation." });
      }
    });

    socket.on("chat:leave", (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });
  });

  app.set("io", io);
  return io;
};

module.exports = { initializeSocket };