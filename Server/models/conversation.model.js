const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    guest: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    host: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    apartment: { type: mongoose.Schema.Types.ObjectId, ref: "Apartment", required: true, index: true },
    lastMessage: { type: String, default: "", trim: true },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    unreadForGuest: { type: Number, default: 0 },
    unreadForHost: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);
conversationSchema.index({ guest: 1, host: 1, apartment: 1 }, { unique: true });
module.exports = mongoose.model("Conversation", conversationSchema);