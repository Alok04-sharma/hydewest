const asyncHandler = require("express-async-handler");
const Conversation = require("../models/conversation.model");
const Message = require("../models/message.model");
const Apartment = require("../models/apartment.model");
const sendResponse = require("../utils/sendResponse");
const NOTIFICATION_TYPE = require("../constants/notificationType");
const { createUserNotification } = require("../services/notification.service");
const { hasGuestBenefit } = require("../services/guestMembership.service");

const canAccess = (conversation, userId) => [String(conversation.guest), String(conversation.host)].includes(String(userId));

const startConversation = asyncHandler(async (req, res) => {
  const apartment = await Apartment.findOne({ _id: req.body.apartmentId, isDeleted: false }).select("host title");
  if (!apartment) return sendResponse(res, 404, false, "Property not found.");
  const premiumAllowed = await hasGuestBenefit(req.user._id, "host_chat");
  if (!premiumAllowed) return sendResponse(res, 403, false, "Premium membership is required to chat with a host.", { code: "PREMIUM_REQUIRED" });

  const conversation = await Conversation.findOneAndUpdate(
    { guest: req.user._id, host: apartment.host, apartment: apartment._id },
    { $setOnInsert: { guest: req.user._id, host: apartment.host, apartment: apartment._id } },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
  ).populate("host guest", "name avatar role").populate("apartment", "title images");
  return sendResponse(res, 200, true, "Conversation ready.", conversation);
});

const getConversations = asyncHandler(async (req, res) => {
  const filter = req.user.role === "host" || req.user.isHost ? { host: req.user._id } : { guest: req.user._id };
  const conversations = await Conversation.find({ ...filter, isDeleted: false })
    .populate("host guest", "name avatar role")
    .populate("apartment", "title images")
    .sort({ lastMessageAt: -1 });
  return sendResponse(res, 200, true, "Conversations fetched.", conversations);
});

const getMessages = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.conversationId);
  if (!conversation || !canAccess(conversation, req.user._id)) return sendResponse(res, 404, false, "Conversation not found.");
  const messages = await Message.find({ conversation: conversation._id, isDeleted: false }).sort({ createdAt: 1 }).populate("sender", "name avatar role");
  const hostView = String(conversation.host) === String(req.user._id);
  await Message.updateMany({ conversation: conversation._id, receiver: req.user._id, isRead: false }, { $set: { isRead: true, readAt: new Date() } });
  conversation[hostView ? "unreadForHost" : "unreadForGuest"] = 0;
  await conversation.save();
  return sendResponse(res, 200, true, "Messages fetched.", messages);
});

const sendMessage = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.conversationId);
  if (!conversation || !canAccess(conversation, req.user._id)) return sendResponse(res, 404, false, "Conversation not found.");
  const text = String(req.body.text || "").trim();
  if (!text) return sendResponse(res, 400, false, "Message cannot be empty.");
  if (text.length > 2000) {
    return sendResponse(res, 400, false, "Message must be 2000 characters or fewer.");
  }

  const senderIsHost = String(conversation.host) === String(req.user._id);
  const receiver = senderIsHost ? conversation.guest : conversation.host;
  const message = await Message.create({ conversation: conversation._id, sender: req.user._id, receiver, text, messageType: "text" });
  conversation.lastMessage = text;
  conversation.lastMessageAt = new Date();
  conversation[senderIsHost ? "unreadForGuest" : "unreadForHost"] += 1;
  await conversation.save();

  await createUserNotification({
    recipient: receiver,
    type: NOTIFICATION_TYPE.NEW_CHAT_MESSAGE,
    title: "New chat message",
    message: text.length > 90 ? `${text.slice(0, 87)}...` : text,
    actor: req.user._id,
    entityType: "Conversation",
    entityId: conversation._id,
    actionUrl: senderIsHost ? `/guest/messages/${conversation._id}` : `/host/messages/${conversation._id}`,
  });

  const io = req.app.get("io");
  if (io) io.to(`user:${receiver}`).emit("chat:new-message", { conversationId: conversation._id, message });
  return sendResponse(res, 201, true, "Message sent.", await message.populate("sender", "name avatar role"));
});

module.exports = { startConversation, getConversations, getMessages, sendMessage };
