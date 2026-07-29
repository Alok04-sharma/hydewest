const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const SupportTicket = require("../models/supportTicket.model");
const Booking = require("../models/booking.model");
const ROLES = require("../constants/roles");
const sendResponse = require("../utils/sendResponse");
const { createAdminNotifications, createUserNotification } = require("../services/notification.service");
const NOTIFICATION_TYPE = require("../constants/notificationType");

const allowedCategories = ["booking", "payment", "cancellation", "listing", "subscription", "account", "technical", "other"];

const createTicketNumber = () =>
  `HWS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const createSupportTicket = asyncHandler(async (req, res) => {
  const category = String(req.body.category || "other").toLowerCase();
  const subject = String(req.body.subject || "").trim();
  const message = String(req.body.message || "").trim();
  const bookingId = req.body.bookingId || null;

  if (subject.length < 4 || message.length < 10) {
    return sendResponse(res, 400, false, "Add a clear subject and a message of at least 10 characters.");
  }

  let booking = null;
  if (bookingId && mongoose.isValidObjectId(bookingId)) {
    booking = await Booking.findOne({
      _id: bookingId,
      isDeleted: { $ne: true },
      $or: [{ guest: req.user._id }, { host: req.user._id }],
    }).select("_id");
  }

  const requesterRole = String(req.user.role || "guest");
  const priority = requesterRole === ROLES.GUEST && req.body.priority === "priority" ? "priority" : "standard";
  const ticket = await SupportTicket.create({
    ticketNumber: createTicketNumber(),
    requester: req.user._id,
    requesterRole,
    guest: requesterRole === ROLES.GUEST ? req.user._id : null,
    booking: booking?._id || null,
    category: allowedCategories.includes(category) ? category : "other",
    subject,
    message,
    priority,
  });

  createAdminNotifications({
    type: NOTIFICATION_TYPE.SUPPORT_TICKET,
    title: "New CRM support ticket",
    message: `${ticket.ticketNumber}: ${subject}`,
    actor: req.user._id,
    entityType: "SupportTicket",
    entityId: ticket._id,
    actionUrl: "/owner/support",
    eventKey: `support-ticket:${ticket._id}`,
  }).catch(() => null);

  return sendResponse(res, 201, true, "Support request created successfully.", ticket);
});

const getMySupportTickets = asyncHandler(async (req, res) => {
  const tickets = await SupportTicket.find({
    isDeleted: false,
    $or: [{ requester: req.user._id }, { guest: req.user._id }],
  })
    .populate("booking", "checkIn checkOut status")
    .sort({ createdAt: -1 })
    .lean();

  return sendResponse(res, 200, true, "Support requests fetched successfully.", tickets);
});

const getAdminSupportTickets = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
  const query = { isDeleted: false };
  if (req.query.status && req.query.status !== "all") query.status = req.query.status;
  if (req.query.priority && req.query.priority !== "all") query.priority = req.query.priority;
  if (req.query.category && req.query.category !== "all") query.category = req.query.category;

  const [tickets, total] = await Promise.all([
    SupportTicket.find(query)
      .populate("requester guest", "name email role avatar")
      .populate("booking", "checkIn checkOut status")
      .sort({ priority: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    SupportTicket.countDocuments(query),
  ]);

  return sendResponse(res, 200, true, "CRM support tickets fetched successfully.", {
    tickets,
    pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
  });
});

const updateAdminSupportTicket = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.ticketId)) return sendResponse(res, 400, false, "Invalid ticket ID.");
  const status = String(req.body.status || "");
  const reply = String(req.body.reply || "").trim();
  const update = { assignedTo: req.user._id };
  if (["open", "in_progress", "resolved", "closed"].includes(status)) {
    update.status = status;
    update.resolvedAt = ["resolved", "closed"].includes(status) ? new Date() : null;
  }
  if (reply) {
    update.$push = { replies: { sender: req.user._id, message: reply, isAdminReply: true } };
  }

  const ticket = await SupportTicket.findOneAndUpdate(
    { _id: req.params.ticketId, isDeleted: false },
    update.$push ? { $set: { assignedTo: update.assignedTo, ...(update.status ? { status: update.status, resolvedAt: update.resolvedAt } : {}) }, $push: update.$push } : { $set: update },
    { new: true }
  );
  if (!ticket) return sendResponse(res, 404, false, "Support ticket not found.");

  const recipient = ticket.requester || ticket.guest;
  if (recipient) {
    createUserNotification({
      recipient,
      type: NOTIFICATION_TYPE.SUPPORT_TICKET,
      title: `Support ticket ${ticket.status.replace("_", " ")}`,
      message: reply || `${ticket.ticketNumber} is now ${ticket.status.replace("_", " ")}.`,
      actor: req.user._id,
      entityType: "SupportTicket",
      entityId: ticket._id,
      actionUrl: "/support",
      eventKey: `support-ticket-update:${ticket._id}:${ticket.updatedAt?.getTime?.() || Date.now()}`,
    }).catch(() => null);
  }

  return sendResponse(res, 200, true, "Support ticket updated successfully.", ticket);
});

module.exports = {
  createSupportTicket,
  getMySupportTickets,
  getAdminSupportTickets,
  updateAdminSupportTicket,
};
