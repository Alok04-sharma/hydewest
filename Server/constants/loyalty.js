const LOYALTY_CONFIG = Object.freeze({
  FREE_POINTS_PER_100: Number(process.env.LOYALTY_FREE_POINTS_PER_100 || 10),
  PREMIUM_POINTS_PER_100: Number(
    process.env.LOYALTY_PREMIUM_POINTS_PER_100 || 15
  ),

  /*
   * 100 points = ₹1 by default.
   * This keeps the wallet useful without turning points into an
   * unrealistically large cash discount.
   */
  POINTS_PER_RUPEE_DISCOUNT: Number(
    process.env.LOYALTY_POINTS_PER_RUPEE || 100
  ),

  /* A booking can use loyalty value for at most 15% of the payable amount. */
  MAX_REDEMPTION_PERCENT: Number(
    process.env.LOYALTY_MAX_REDEMPTION_PERCENT || 15
  ),

  /* Successful Premium referral reward: 2,500 points = ₹25 by default. */
  REFERRAL_REWARD_POINTS: Number(
    process.env.LOYALTY_REFERRAL_REWARD_POINTS || 2500
  ),
});

const LOYALTY_TRANSACTION_TYPE = Object.freeze({
  BOOKING_REWARD: "booking_reward",
  BOOKING_CANCELLATION_REVERSAL: "booking_cancellation_reversal",
  POINTS_REDEMPTION: "points_redemption",
  REFUND_RESTORE: "refund_restore",
  REFERRAL_REWARD: "referral_reward",
  MONTHLY_PREMIUM_BONUS: "monthly_premium_bonus",
  ADMIN_ADJUSTMENT: "admin_adjustment",
});

module.exports = {
  LOYALTY_CONFIG,
  LOYALTY_TRANSACTION_TYPE,
};