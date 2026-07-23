const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");
const ROLES = require("../constants/roles");

const {
  getDashboard,
  getPendingApartments,
  getApartmentByIdForOwner,
  approveApartment,
  rejectApartment,
} = require("../controllers/owner.controller");

const {
  getHosts,
  getHostProfile,
  suspendHost,
  removeHost,
} = require("../controllers/ownerHost.controller");

const {
  getListings,
  getListingDetails,
  approveListing,
  suspendListing,
  removeListing,
} = require("../controllers/ownerListing.controller");

const {
  getBookings,
  getBookingDetails,
} = require("../controllers/ownerBooking.controller");

const {
  getSubscriptions,
  getSubscriptionDetails,
  getSubscriptionPayments,
} = require("../controllers/ownerSubscription.controller");

const {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} = require("../controllers/ownerNotification.controller");

router.use(authMiddleware);
router.use(roleMiddleware(ROLES.OWNER, ROLES.SUPER_ADMIN));

// Super Admin Dashboard
router.get("/dashboard", getDashboard);

// Notifications — static routes before /:notificationId
router.get("/notifications", getNotifications);
router.get("/notifications/unread-count", getUnreadCount);
router.patch("/notifications/read-all", markAllNotificationsRead);
router.patch("/notifications/:notificationId/read", markNotificationRead);
router.delete("/notifications/:notificationId", deleteNotification);

// Subscription Management
router.get("/subscriptions", getSubscriptions);
router.get("/subscriptions/payments", getSubscriptionPayments);
router.get("/subscriptions/:subscriptionId", getSubscriptionDetails);

// Host Management
router.get("/hosts", getHosts);
router.get("/hosts/:hostId", getHostProfile);
router.patch("/hosts/:hostId/suspend", suspendHost);
router.delete("/hosts/:hostId", removeHost);

// Listing Management
router.get("/listings", getListings);
router.get("/listings/:listingId", getListingDetails);
router.patch("/listings/:listingId/approve", approveListing);
router.patch("/listings/:listingId/suspend", suspendListing);
router.delete("/listings/:listingId", removeListing);

// Booking Monitoring
router.get("/bookings", getBookings);
router.get("/bookings/:bookingId", getBookingDetails);

// Legacy Property Approval Routes
router.get("/apartments/pending", getPendingApartments);
router.get("/apartments/:id", getApartmentByIdForOwner);
router.patch("/apartments/:id/approve", approveApartment);
router.patch("/apartments/:id/reject", rejectApartment);

module.exports = router;
