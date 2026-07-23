const mongoose = require("mongoose");
const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    messageType: { type: String, enum: ["text", "image"], default: "text" },
    text: { type: String, default: "", trim: true, maxlength: 2000 },
    image: { url: { type: String, default: "" }, publicId: { type: String, default: "" } },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);
messageSchema.index({ conversation: 1, createdAt: 1 });
module.exports = mongoose.model("Message", messageSchema);