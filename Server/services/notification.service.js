const mongoose = require("mongoose");

const Notification = require("../models/notification.model");
const User = require("../models/user.model");
const ROLES = require("../constants/roles");
const USER_STATUS = require("../constants/userStatus");

const ADMIN_ROLES = [ROLES.OWNER, ROLES.SUPER_ADMIN].filter(Boolean);

const blockedStatuses = [
  USER_STATUS.SUSPENDED,
  USER_STATUS.BLOCKED,
  USER_STATUS.REMOVED,
].filter(Boolean);

const normalizeMetadata = (metadata = {}) => ({
  ...(metadata || {}),
});

/**
 * Creates one recipient notification.
 *
 * eventKey is optional. When supplied, the notification becomes idempotent
 * for that recipient, so scheduler retries cannot create duplicate alerts.
 */
const createUserNotification = async ({
  recipient,
  type,
  title,
  message,
  actor = null,
  entityType = "",
  entityId = null,
  actionUrl = "",
  metadata = {},
  eventKey = "",
}) => {
  if (!recipient || !mongoose.isValidObjectId(recipient)) {
    return null;
  }

  const user = await User.findOne({
    _id: recipient,
    isDeleted: { $ne: true },
  })
    .select("_id status")
    .lean();

  if (!user) {
    return null;
  }

  const notificationData = {
    recipient: user._id,
    type,
    title,
    message,
    actor,
    entityType,
    entityId,
    actionUrl,
    metadata: normalizeMetadata(metadata),
    dedupeKey: eventKey,
  };

  if (!eventKey) {
    return Notification.create(notificationData);
  }

  try {
    return await Notification.findOneAndUpdate(
      {
        recipient: user._id,
        dedupeKey: eventKey,
        isDeleted: false,
      },
      {
        $setOnInsert: notificationData,
      },
      {
        returnDocument: "after",
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );
  } catch (error) {
    // Two workers can race on the same idempotency key. The unique partial
    // index chooses one winner; every other worker returns that same record.
    if (error?.code === 11000) {
      return Notification.findOne({
        recipient: user._id,
        dedupeKey: eventKey,
        isDeleted: false,
      });
    }

    throw error;
  }
};

const createAdminNotifications = async ({
  type,
  title,
  message,
  actor = null,
  entityType = "",
  entityId = null,
  actionUrl = "",
  metadata = {},
  eventKey = "",
}) => {
  const admins = await User.find({
    role: { $in: ADMIN_ROLES },
    status: { $nin: blockedStatuses },
    isDeleted: { $ne: true },
  })
    .select("_id")
    .lean();

  if (!admins.length) {
    return [];
  }

  return Promise.all(
    admins.map((admin) =>
      createUserNotification({
        recipient: admin._id,
        type,
        title,
        message,
        actor,
        entityType,
        entityId,
        actionUrl,
        metadata,
        eventKey: eventKey ? `${eventKey}:admin:${admin._id}` : "",
      })
    )
  );
};

module.exports = {
  createUserNotification,
  createAdminNotifications,
};