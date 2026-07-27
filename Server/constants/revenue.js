const REVENUE_TYPE = Object.freeze({
  HOST_SUBSCRIPTION: "host_subscription",
  GUEST_BOOKING_COMMISSION: "guest_booking_commission",
});

const HOST_TIER = Object.freeze({
  FREE: "free",
  SUBSCRIBED: "subscribed",
});

/**
 * Phase-1 revenue-sharing rules.
 *
 * commissionPercentage stored on a Host means
 * the Super Admin/platform commission percentage.
 */
const HOST_COMMISSION = Object.freeze({
  FREE_ADMIN_PERCENT: 30,
  FREE_HOST_PERCENT: 70,

  SUBSCRIBED_ADMIN_PERCENT: 10,
  SUBSCRIBED_HOST_PERCENT: 90,

  FREE_LISTING_LIMIT: 2,
});

module.exports = {
  REVENUE_TYPE,
  HOST_TIER,
  HOST_COMMISSION,
};