const GUEST_MEMBERSHIP_PLANS = Object.freeze({
  premium_monthly: Object.freeze({
    code: "premium_monthly",
    name: "Premium Monthly",
    durationMonths: 1,
    amount: Number(process.env.GUEST_PREMIUM_MONTHLY_PRICE || 299),
    currency: "INR",
    discountPercent: 12,
    loyaltyMultiplier: 1.5,
  }),
  premium_quarterly: Object.freeze({
    code: "premium_quarterly",
    name: "Premium Quarterly",
    durationMonths: 3,
    amount: Number(process.env.GUEST_PREMIUM_QUARTERLY_PRICE || 799),
    currency: "INR",
    discountPercent: 12,
    loyaltyMultiplier: 1.5,
  }),
  premium_yearly: Object.freeze({
    code: "premium_yearly",
    name: "Premium Yearly",
    durationMonths: 12,
    amount: Number(process.env.GUEST_PREMIUM_YEARLY_PRICE || 2499),
    currency: "INR",
    discountPercent: 15,
    loyaltyMultiplier: 1.75,
  }),
});

const PREMIUM_BENEFITS = Object.freeze([
  "discounted_booking",
  "host_chat",
  "early_access",
  "premium_badge",
  "priority_support",
  "exclusive_properties",
  "hidden_discounts",
  "extended_cancellation",
  "priority_booking",
  "premium_filters",
  "price_history",
  "price_drop_alerts",
  "unlimited_wishlist",
  "ai_trip_planner",
  "reward_multiplier",
  "monthly_coupons",
  "premium_reviews",
  "booking_insurance",
  "referral_credits",
  "smart_recommendations",
]);

const getGuestMembershipPlans = () =>
  Object.values(GUEST_MEMBERSHIP_PLANS).map((plan) => ({
    ...plan,
    benefits: [...PREMIUM_BENEFITS],
  }));

const getGuestMembershipPlan = (planCode) => {
  const plan = GUEST_MEMBERSHIP_PLANS[String(planCode || "").trim().toLowerCase()];
  return plan ? { ...plan, benefits: [...PREMIUM_BENEFITS] } : null;
};

module.exports = {
  GUEST_MEMBERSHIP_PLANS,
  PREMIUM_BENEFITS,
  getGuestMembershipPlans,
  getGuestMembershipPlan,
};