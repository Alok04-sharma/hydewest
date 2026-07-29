const mongoose = require("mongoose");

const supportReplySchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true, trim: true, minlength: 2, maxlength: 2000 },
    isAdminReply: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const supportTicketSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, required: true, unique: true, index: true },
    requester: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    requesterRole: { type: String, default: "guest", trim: true, index: true },
    // Legacy field retained for existing Guest support APIs and documents.
    guest: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    category: {
      type: String,
      enum: ["booking", "payment", "cancellation", "listing", "subscription", "account", "technical", "other"],
      default: "other",
      index: true,
    },
    subject: { type: String, required: true, trim: true, minlength: 4, maxlength: 140 },
    message: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    priority: { type: String, enum: ["standard", "priority", "urgent"], default: "standard", index: true },
    status: { type: String, enum: ["open", "in_progress", "resolved", "closed"], default: "open", index: true },
    replies: { type: [supportReplySchema], default: [] },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

supportTicketSchema.index({ requester: 1, createdAt: -1 });
supportTicketSchema.index({ guest: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, priority: 1, createdAt: -1 });

module.exports = mongoose.model("SupportTicket", supportTicketSchema);
