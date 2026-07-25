const PRICING_UNIT = require("./pricingUnit");

const RATE_MULTIPLIERS = Object.freeze({
  [PRICING_UNIT.HOUR]: 0.08,
  [PRICING_UNIT.NIGHT]: 0.9,
  [PRICING_UNIT.DAY]: 1,
  [PRICING_UNIT.WEEK]: 6,
  [PRICING_UNIT.MONTH]: 24,
});

const roundRate = (value) => {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  if (amount < 100) {
    return Math.max(Math.round(amount), 1);
  }

  return Math.max(Math.round(amount / 10) * 10, 1);
};

const generateRatesFromDailyPrice = (dailyPrice, overrides = {}) => {
  const day = roundRate(dailyPrice);

  if (day <= 0) {
    return {
      hour: 0,
      night: 0,
      day: 0,
      week: 0,
      month: 0,
    };
  }

  const generated = {
    hour: roundRate(day * RATE_MULTIPLIERS.hour),
    night: roundRate(day * RATE_MULTIPLIERS.night),
    day,
    week: roundRate(day * RATE_MULTIPLIERS.week),
    month: roundRate(day * RATE_MULTIPLIERS.month),
  };

  Object.keys(generated).forEach((unit) => {
    const override = Number(overrides?.[unit]);

    if (Number.isFinite(override) && override > 0) {
      generated[unit] = roundRate(override);
    }
  });

  return generated;
};

const DEFAULT_HOST_COUPON_PRESETS = Object.freeze([
  Object.freeze({
    code: "WELCOME10",
    label: "Welcome Offer",
    description: "10% off for guests trying this stay.",
    discountType: "percentage",
    discountValue: 10,
    minBookingAmount: 1500,
    maxDiscount: 1000,
    usageLimit: 100,
    premiumOnly: false,
    paymentMethod: "any",
    source: "preset",
    isActive: true,
  }),
  Object.freeze({
    code: "STAYMORE12",
    label: "Long Stay Saver",
    description: "12% off on higher-value stays.",
    discountType: "percentage",
    discountValue: 12,
    minBookingAmount: 7000,
    maxDiscount: 2500,
    usageLimit: 100,
    premiumOnly: false,
    paymentMethod: "any",
    source: "preset",
    isActive: true,
  }),
  Object.freeze({
    code: "UPI5",
    label: "UPI Payment Offer",
    description: "5% off when the booking is paid through UPI.",
    discountType: "percentage",
    discountValue: 5,
    minBookingAmount: 1500,
    maxDiscount: 500,
    usageLimit: 200,
    premiumOnly: false,
    paymentMethod: "upi",
    source: "preset",
    isActive: true,
  }),
  Object.freeze({
    code: "CARD7",
    label: "Card Payment Offer",
    description: "7% off when the booking is paid by card.",
    discountType: "percentage",
    discountValue: 7,
    minBookingAmount: 3000,
    maxDiscount: 750,
    usageLimit: 200,
    premiumOnly: false,
    paymentMethod: "card",
    source: "preset",
    isActive: true,
  }),
  Object.freeze({
    code: "PREMIUM15",
    label: "Premium Member Deal",
    description: "Extra 15% host offer for active Premium guests.",
    discountType: "percentage",
    discountValue: 15,
    minBookingAmount: 2500,
    maxDiscount: 3000,
    usageLimit: 100,
    premiumOnly: true,
    paymentMethod: "any",
    source: "preset",
    isActive: true,
  }),
  Object.freeze({
    code: "PREMIUM500",
    label: "Premium Flat Saver",
    description: "Flat ₹500 off for Premium guests on qualifying stays.",
    discountType: "fixed",
    discountValue: 500,
    minBookingAmount: 5000,
    maxDiscount: 500,
    usageLimit: 100,
    premiumOnly: true,
    paymentMethod: "any",
    source: "preset",
    isActive: true,
  }),
]);

const cloneDefaultCouponPresets = () =>
  DEFAULT_HOST_COUPON_PRESETS.map((coupon) => ({
    ...coupon,
    validFrom: new Date(),
    validUntil: null,
    usedCount: 0,
  }));

module.exports = {
  RATE_MULTIPLIERS,
  DEFAULT_HOST_COUPON_PRESETS,
  generateRatesFromDailyPrice,
  cloneDefaultCouponPresets,
  roundRate,
};