const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} = require("../controllers/notification.controller");

const router = express.Router();

router.use(authMiddleware);

// Static routes must remain above /:notificationId routes.
router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:notificationId/read", markNotificationRead);
router.delete("/:notificationId", deleteNotification);

module.exports = router;