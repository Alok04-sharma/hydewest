const SUBSCRIPTION_STATUS = Object.freeze({
  PENDING: "pending",
  ACTIVE: "active",
  SCHEDULED: "scheduled",
  EXPIRED: "expired",
  FAILED: "failed",
  CANCELLED: "cancelled",
});

const SUBSCRIPTION_PAYMENT_STATUS = Object.freeze({
  PENDING: "pending",
  SUCCESS: "success",
  FAILED: "failed",
  REFUNDED: "refunded",
});

module.exports = {
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_PAYMENT_STATUS,
};
