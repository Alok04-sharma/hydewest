const getPrice = (envName, fallback) => {
  const value = Number(process.env[envName]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const SUBSCRIPTION_PLANS = Object.freeze({
  ONE_MONTH: Object.freeze({
    code: "1_month",
    name: "1 Month",
    durationMonths: 1,
    amount: getPrice("SUBSCRIPTION_PRICE_1_MONTH", 499),
    currency: "INR",
  }),
  THREE_MONTHS: Object.freeze({
    code: "3_months",
    name: "3 Months",
    durationMonths: 3,
    amount: getPrice("SUBSCRIPTION_PRICE_3_MONTHS", 1299),
    currency: "INR",
  }),
  SIX_MONTHS: Object.freeze({
    code: "6_months",
    name: "6 Months",
    durationMonths: 6,
    amount: getPrice("SUBSCRIPTION_PRICE_6_MONTHS", 2399),
    currency: "INR",
  }),
  TWELVE_MONTHS: Object.freeze({
    code: "12_months",
    name: "12 Months",
    durationMonths: 12,
    amount: getPrice("SUBSCRIPTION_PRICE_12_MONTHS", 4199),
    currency: "INR",
  }),
});

const getSubscriptionPlans = () => Object.values(SUBSCRIPTION_PLANS);

const getSubscriptionPlan = (planCode) =>
  getSubscriptionPlans().find((plan) => plan.code === planCode) || null;

module.exports = {
  SUBSCRIPTION_PLANS,
  getSubscriptionPlans,
  getSubscriptionPlan,
};
