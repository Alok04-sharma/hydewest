const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");

const Notification = require("../models/notification.model");
const NOTIFICATION_TYPE = require("../constants/notificationType");
const sendResponse = require("../utils/sendResponse");

const getNotifications = asyncHandler(async (req, res) => {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(
    Math.max(Number.parseInt(req.query.limit, 10) || 15, 1),
    50
  );
  const type = String(req.query.type || "all");
  const readStatus = String(req.query.readStatus || "all");

  const query = {
    recipient: req.user._id,
    isDeleted: false,
  };

  if (type !== "all" && Object.values(NOTIFICATION_TYPE).includes(type)) {
    query.type = type;
  }

  if (readStatus === "read") {
    query.isRead = true;
  }

  if (readStatus === "unread") {
    query.isRead = false;
  }

  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .populate("actor", "name email role avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    Notification.countDocuments(query),

    Notification.countDocuments({
      recipient: req.user._id,
      isDeleted: false,
      isRead: false,
    }),
  ]);

  return sendResponse(res, 200, true, "Notifications fetched successfully.", {
    notifications,
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
  });
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const unreadCount = await Notification.countDocuments({
    recipient: req.user._id,
    isDeleted: false,
    isRead: false,
  });

  return sendResponse(res, 200, true, "Unread notification count fetched.", {
    unreadCount,
  });
});

const markNotificationRead = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.notificationId)) {
    return sendResponse(res, 400, false, "Invalid notification ID.");
  }

  const notification = await Notification.findOneAndUpdate(
    {
      _id: req.params.notificationId,
      recipient: req.user._id,
      isDeleted: false,
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    },
    { new: true }
  );

  if (!notification) {
    return sendResponse(res, 404, false, "Notification not found.");
  }

  return sendResponse(
    res,
    200,
    true,
    "Notification marked as read.",
    notification
  );
});

const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    {
      recipient: req.user._id,
      isDeleted: false,
      isRead: false,
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    }
  );

  return sendResponse(res, 200, true, "All notifications marked as read.", {
    modifiedCount: result.modifiedCount || 0,
  });
});

const deleteNotification = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.notificationId)) {
    return sendResponse(res, 400, false, "Invalid notification ID.");
  }

  const notification = await Notification.findOneAndUpdate(
    {
      _id: req.params.notificationId,
      recipient: req.user._id,
      isDeleted: false,
    },
    {
      $set: {
        isDeleted: true,
      },
    },
    { new: true }
  );

  if (!notification) {
    return sendResponse(res, 404, false, "Notification not found.");
  }

  return sendResponse(res, 200, true, "Notification removed successfully.");
});

module.exports = {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
};

