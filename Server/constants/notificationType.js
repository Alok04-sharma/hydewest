const NOTIFICATION_TYPE = Object.freeze({
  OTP: "otp",
  BOOKING: "booking",
  APPROVAL: "approval",
  REJECTION: "rejection",
  CANCELLATION: "cancellation",
  PAYMENT: "payment",
  SYSTEM: "system",

  NEW_BOOKING: "new_booking",
  BOOKING_CONFIRMED: "booking_confirmed",
  BOOKING_CANCELLED: "booking_cancelled",
  CHECKIN_REMINDER: "checkin_reminder",
  CHECKOUT_REMINDER: "checkout_reminder",
  ROOM_AVAILABLE: "room_available",
  NEW_CHAT_MESSAGE: "new_chat_message",

  HOST_SUBSCRIPTION_PAYMENT_RECEIVED: "host_subscription_payment_received",
  HOST_SUBSCRIPTION_PAYMENT_PENDING: "host_subscription_payment_pending",
  HOST_SUBSCRIPTION_PAYMENT_FAILED: "host_subscription_payment_failed",
  HOST_SUBSCRIPTION_RENEWAL_SCHEDULED: "host_subscription_renewal_scheduled",
  SUBSCRIPTION_PAYMENT_REMINDER: "subscription_payment_reminder",
  SUBSCRIPTION_RENEWAL_CONFIRMED: "subscription_renewal_confirmed",

  NEW_LISTING_PENDING_APPROVAL: "new_listing_pending_approval",
  LISTING_APPROVED: "listing_approved",
  LISTING_SUSPENDED: "listing_suspended",
  LISTING_REMOVED: "listing_removed",
  SUBSCRIPTION_EXPIRED: "subscription_expired",
});

module.exports = NOTIFICATION_TYPE;
