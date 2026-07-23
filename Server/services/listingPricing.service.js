const PRICING_UNIT = require("../constants/pricingUnit");

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const calculateBillableUnits = (checkIn, checkOut, priceUnit) => {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const difference = end.getTime() - start.getTime();

  if (!Number.isFinite(difference) || difference <= 0) {
    throw new Error("Check-out must be after check-in.");
  }

  switch (priceUnit) {
    case PRICING_UNIT.HOUR:
      return Math.max(Math.ceil(difference / HOUR_MS), 1);
    case PRICING_UNIT.WEEK:
      return Math.max(Math.ceil(difference / (7 * DAY_MS)), 1);
    case PRICING_UNIT.MONTH:
      return Math.max(Math.ceil(difference / (30 * DAY_MS)), 1);
    case PRICING_UNIT.DAY:
    case PRICING_UNIT.NIGHT:
    default:
      return Math.max(Math.ceil(difference / DAY_MS), 1);
  }
};

const getActiveCoupon = (apartment, couponCode, eligibleAmount, now = new Date()) => {
  const normalizedCode = String(couponCode || "").trim().toUpperCase();

  if (!normalizedCode) {
    return null;
  }

  const coupon = apartment.coupons?.find(
    (item) => String(item.code || "").toUpperCase() === normalizedCode
  );

  if (!coupon || coupon.isActive === false) {
    throw new Error("Invalid or inactive coupon code.");
  }

  if (coupon.validFrom && new Date(coupon.validFrom) > now) {
    throw new Error("This coupon is not active yet.");
  }

  if (coupon.validUntil && new Date(coupon.validUntil) < now) {
    throw new Error("This coupon has expired.");
  }

  if (
    Number(coupon.usageLimit || 0) > 0 &&
    Number(coupon.usedCount || 0) >= Number(coupon.usageLimit)
  ) {
    throw new Error("This coupon usage limit has been reached.");
  }

  if (eligibleAmount < Number(coupon.minBookingAmount || 0)) {
    throw new Error(
      `Minimum booking amount for this coupon is ${coupon.minBookingAmount}.`
    );
  }

  return coupon;
};

const calculateListingQuote = ({
  apartment,
  checkIn,
  checkOut,
  guestsCount,
  couponCode = "",
}) => {
  if (!apartment) {
    throw new Error("Apartment is required for quote calculation.");
  }

  const pricing = apartment.pricing || {};
  const priceUnit = pricing.priceUnit || PRICING_UNIT.NIGHT;
  const basePrice = Number(pricing.basePrice || pricing.pricePerNight || 0);

  if (basePrice <= 0) {
    throw new Error("Property pricing is not configured correctly.");
  }

  const unitCount = calculateBillableUnits(checkIn, checkOut, priceUnit);
  const guestCount = Math.max(Number(guestsCount || 1), 1);
  const includedGuests = Math.max(
    Number(pricing.baseGuestCount || apartment.guests || 1),
    1
  );
  const extraGuestCount = Math.max(guestCount - includedGuests, 0);
  const extraGuestFee = Number(pricing.extraGuestFee || 0);

  const subtotal = roundMoney(basePrice * unitCount);
  const extraGuestCharge = roundMoney(extraGuestCount * extraGuestFee * unitCount);
  const cleaningFee = roundMoney(pricing.cleaningFee || 0);
  const serviceFee = roundMoney(pricing.serviceFee || 0);
  const eligibleAmount = roundMoney(subtotal + extraGuestCharge);

  const coupon = getActiveCoupon(apartment, couponCode, eligibleAmount);
  let discountAmount = 0;

  if (coupon) {
    if (coupon.discountType === "percentage") {
      discountAmount = eligibleAmount * (Number(coupon.discountValue || 0) / 100);
    } else {
      discountAmount = Number(coupon.discountValue || 0);
    }

    if (Number(coupon.maxDiscount || 0) > 0) {
      discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
    }

    discountAmount = Math.min(discountAmount, eligibleAmount);
  }

  discountAmount = roundMoney(discountAmount);
  const totalAmount = roundMoney(
    Math.max(eligibleAmount + cleaningFee + serviceFee - discountAmount, 0)
  );

  const totalNights = Math.max(
    Math.ceil((new Date(checkOut) - new Date(checkIn)) / DAY_MS),
    1
  );

  return {
    basePrice,
    priceUnit,
    unitCount,
    pricePerNight: basePrice,
    totalNights,
    subtotal,
    includedGuests,
    extraGuestCount,
    extraGuestFee,
    extraGuestCharge,
    cleaningFee,
    serviceFee,
    couponCode: coupon?.code || "",
    discountAmount,
    totalAmount,
    currency: pricing.currency || "INR",
  };
};

module.exports = {
  calculateBillableUnits,
  calculateListingQuote,
};
