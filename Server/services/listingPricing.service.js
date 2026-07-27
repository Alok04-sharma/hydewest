const PRICING_UNIT = require("../constants/pricingUnit");
const { LOYALTY_CONFIG } = require("../constants/loyalty");
const { generateRatesFromDailyPrice } = require("../constants/pricingPresets");

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const FALLBACK_BOOKING_UNIT = PRICING_UNIT?.NIGHT || "night";
const VALID_UNITS = new Set(["hour", "night", "day", "week", "month"]);
const PUBLIC_BOOKING_UNITS = new Set(["hour", "night", "week", "month"]);
const VALID_PAYMENT_METHODS = new Set(["any", "upi", "card"]);

const LEGACY_UNIT_TO_DAILY_DIVISOR = Object.freeze({
  hour: 0.08,
  night: 0.9,
  day: 1,
  week: 6,
  month: 24,
});

const roundMoney = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const toPositiveNumber = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

const normalizeBookingUnit = (value) => {
  const unit = String(value || "").trim().toLowerCase();
  return VALID_UNITS.has(unit) ? unit : FALLBACK_BOOKING_UNIT;
};

const normalizePaymentMethod = (value) => {
  const method = String(value || "any").trim().toLowerCase();
  return VALID_PAYMENT_METHODS.has(method) ? method : "any";
};

const inferDailyPrice = (pricing = {}) => {
  const rates = pricing?.rates || {};

  const explicitDayRate = toPositiveNumber(rates.day);
  if (explicitDayRate > 0) return explicitDayRate;

  const legacyBasePrice = toPositiveNumber(pricing.basePrice);
  const legacyUnit = normalizeBookingUnit(pricing.priceUnit);
  const legacyDivisor = LEGACY_UNIT_TO_DAILY_DIVISOR[legacyUnit] || 1;

  if (legacyBasePrice > 0 && pricing.priceUnit) {
    return legacyBasePrice / legacyDivisor;
  }

  const nightlyPrice =
    toPositiveNumber(rates.night) ||
    toPositiveNumber(pricing.pricePerNight);
  if (nightlyPrice > 0) {
    return nightlyPrice / LEGACY_UNIT_TO_DAILY_DIVISOR.night;
  }

  const hourlyPrice = toPositiveNumber(rates.hour);
  if (hourlyPrice > 0) {
    return hourlyPrice / LEGACY_UNIT_TO_DAILY_DIVISOR.hour;
  }

  const weeklyPrice = toPositiveNumber(rates.week);
  if (weeklyPrice > 0) {
    return weeklyPrice / LEGACY_UNIT_TO_DAILY_DIVISOR.week;
  }

  const monthlyPrice = toPositiveNumber(rates.month);
  if (monthlyPrice > 0) {
    return monthlyPrice / LEGACY_UNIT_TO_DAILY_DIVISOR.month;
  }

  return legacyBasePrice;
};

const resolveListingRates = (apartment) => {
  const pricing = apartment?.pricing || {};
  const dailyPrice = inferDailyPrice(pricing);

  if (dailyPrice <= 0) {
    return {
      hour: 0,
      night: 0,
      day: 0,
      week: 0,
      month: 0,
    };
  }

  const rates = generateRatesFromDailyPrice(dailyPrice, pricing.rates || {});
  if (Number(apartment?.policies?.minBookingDays || 1) > 1) {
    rates.hour = 0;
  }
  return rates;
};

const getDuration = (checkIn, checkOut) => {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const difference = end.getTime() - start.getTime();

  if (!Number.isFinite(difference) || difference <= 0) {
    throw new Error("Check-out must be after check-in.");
  }

  return {
    start,
    end,
    difference,
    hours: difference / HOUR_MS,
    days: difference / DAY_MS,
  };
};

const validateUnitDuration = (duration, bookingUnit) => {
  if (bookingUnit === PRICING_UNIT.HOUR && duration.hours > 24) {
    throw new Error("Hourly booking can be used for a maximum of 24 hours. Choose Night, Week or Month pricing for a longer stay.");
  }

  if (bookingUnit === PRICING_UNIT.NIGHT && duration.hours < 8) {
    throw new Error("Night pricing requires a stay of at least 8 hours.");
  }

  if (bookingUnit === PRICING_UNIT.DAY && duration.hours < 24) {
    throw new Error("Day pricing requires a stay of at least 24 hours.");
  }

  if (bookingUnit === PRICING_UNIT.WEEK && duration.days < 7) {
    throw new Error("Weekly pricing is available for stays of at least 7 days.");
  }

  if (bookingUnit === PRICING_UNIT.MONTH && duration.days < 28) {
    throw new Error("Monthly pricing is available for stays of at least 28 days.");
  }
};

const calculateCalendarMonths = (start, end) => {
  let months =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth());

  months = Math.max(months, 0);

  const anchor = new Date(start);
  anchor.setUTCMonth(anchor.getUTCMonth() + months);

  if (anchor.getTime() < end.getTime()) {
    months += 1;
  }

  return Math.max(months, 1);
};

const validateHostStayPolicy = (apartment, duration, bookingUnit) => {
  const minimumDays = Math.max(
    Number(apartment?.policies?.minBookingDays || 1),
    1
  );
  const maximumDays = Math.max(
    Number(apartment?.policies?.maxBookingDays || 365),
    minimumDays
  );

  // A one-day default must not remove the Hour option. When the Host sets
  // a stricter value (2+ days), the same minimum is enforced for every unit.
  const minimumHours =
    bookingUnit === PRICING_UNIT.HOUR && minimumDays === 1
      ? 1
      : minimumDays * 24;

  if (duration.hours + Number.EPSILON < minimumHours) {
    throw new Error(
      `The Host requires a minimum stay of ${minimumDays} day(s) for this property.`
    );
  }

  if (duration.hours - Number.EPSILON > maximumDays * 24) {
    throw new Error(
      `The Host allows a maximum stay of ${maximumDays} day(s) for this property.`
    );
  }
};

const calculateBillableUnits = (checkIn, checkOut, bookingUnit) => {
  const unit = normalizeBookingUnit(bookingUnit);
  const duration = getDuration(checkIn, checkOut);
  validateUnitDuration(duration, unit);

  switch (unit) {
    case PRICING_UNIT.HOUR:
      return Math.max(Math.ceil(duration.difference / HOUR_MS), 1);
    case PRICING_UNIT.WEEK:
      return Math.max(Math.ceil(duration.difference / (7 * DAY_MS)), 1);
    case PRICING_UNIT.MONTH:
      return calculateCalendarMonths(duration.start, duration.end);
    case PRICING_UNIT.DAY:
    case PRICING_UNIT.NIGHT:
    default:
      return Math.max(Math.ceil(duration.difference / DAY_MS), 1);
  }
};

const isPremiumMembershipActive = (membership) =>
  Boolean(
    membership?.status === "active" &&
      membership?.expiryDate &&
      new Date(membership.expiryDate) > new Date()
  );

const normalizeCouponForClient = ({
  coupon,
  eligibleAmount,
  now,
  isPremium,
  paymentMethod,
}) => {
  const validFrom = coupon.validFrom ? new Date(coupon.validFrom) : null;
  const validUntil = coupon.validUntil ? new Date(coupon.validUntil) : null;
  const usageLimit = Number(coupon.usageLimit || 0);
  const usedCount = Number(coupon.usedCount || 0);
  const minBookingAmount = Number(coupon.minBookingAmount || 0);
  const requiredPaymentMethod = normalizePaymentMethod(coupon.paymentMethod);

  let lockedReason = "";

  if (coupon.isActive === false) lockedReason = "This coupon is inactive.";
  else if (coupon.premiumOnly && !isPremium) lockedReason = "Premium membership required.";
  else if (validFrom && validFrom > now) lockedReason = "This offer has not started yet.";
  else if (validUntil && validUntil < now) lockedReason = "This offer has expired.";
  else if (usageLimit > 0 && usedCount >= usageLimit) lockedReason = "Usage limit reached.";
  else if (eligibleAmount < minBookingAmount) {
    lockedReason = `Add ₹${Math.ceil(minBookingAmount - eligibleAmount).toLocaleString("en-IN")} more to unlock.`;
  } else if (
    requiredPaymentMethod !== "any" &&
    paymentMethod !== "any" &&
    requiredPaymentMethod !== paymentMethod
  ) {
    lockedReason = `Select ${requiredPaymentMethod.toUpperCase()} as payment method.`;
  }

  return {
    id: coupon._id || null,
    code: String(coupon.code || "").toUpperCase(),
    label: coupon.label || coupon.code,
    description: coupon.description || "Host discount offer",
    discountType: coupon.discountType,
    discountValue: Number(coupon.discountValue || 0),
    minBookingAmount,
    maxDiscount: Number(coupon.maxDiscount || 0),
    premiumOnly: Boolean(coupon.premiumOnly),
    paymentMethod: requiredPaymentMethod,
    source: coupon.source || "custom",
    validUntil: coupon.validUntil || null,
    isLocked: Boolean(lockedReason),
    lockedReason,
    canApply: !lockedReason,
  };
};

const getAvailableCoupons = ({
  apartment,
  eligibleAmount,
  membership,
  paymentMethod = "any",
  now = new Date(),
}) => {
  const isPremium = isPremiumMembershipActive(membership);
  const normalizedMethod = normalizePaymentMethod(paymentMethod);

  return (apartment?.coupons || [])
    .map((coupon) =>
      normalizeCouponForClient({
        coupon,
        eligibleAmount,
        now,
        isPremium,
        paymentMethod: normalizedMethod,
      })
    )
    .filter((coupon) => coupon.code)
    .sort((first, second) => {
      if (first.canApply !== second.canApply) return first.canApply ? -1 : 1;
      if (first.premiumOnly !== second.premiumOnly) return first.premiumOnly ? 1 : -1;
      return first.code.localeCompare(second.code);
    });
};

const getActiveCoupon = ({
  apartment,
  couponCode,
  eligibleAmount,
  membership,
  paymentMethod,
  now = new Date(),
}) => {
  const normalizedCode = String(couponCode || "").trim().toUpperCase();
  if (!normalizedCode) return null;

  const availableCoupons = getAvailableCoupons({
    apartment,
    eligibleAmount,
    membership,
    paymentMethod,
    now,
  });

  const couponStatus = availableCoupons.find(
    (coupon) => coupon.code === normalizedCode
  );

  if (!couponStatus) {
    throw new Error("Invalid coupon code.");
  }

  if (!couponStatus.canApply) {
    throw new Error(couponStatus.lockedReason || "This coupon cannot be applied.");
  }

  return apartment.coupons.find(
    (coupon) => String(coupon.code || "").toUpperCase() === normalizedCode
  );
};

const calculateUnitSavings = ({ rates, bookingUnit, unitCount, duration }) => {
  const dailyEquivalentDays = Math.max(duration.days, duration.hours / 24);
  const regularDailyCost = Number(rates.day || 0) * dailyEquivalentDays;
  const selectedCost = Number(rates[bookingUnit] || 0) * unitCount;
  if (regularDailyCost <= 0 || selectedCost >= regularDailyCost) return 0;
  return Math.max(
    Math.min(Math.round(((regularDailyCost - selectedCost) / regularDailyCost) * 100), 90),
    0
  );
};

const dateKeyUTC = (value) => {
  const date = new Date(value);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
};

const calculateSpecialPriceSubtotal = ({ apartment, duration, unit, unitCount, selectedRate }) => {
  if (![PRICING_UNIT.DAY, PRICING_UNIT.NIGHT].includes(unit)) {
    return {
      subtotal: roundMoney(selectedRate * unitCount),
      specialPriceAdjustments: [],
    };
  }

  const specialPriceMap = new Map(
    (apartment?.availability?.specialPrices || []).map((item) => [
      dateKeyUTC(item.date),
      Number(item.price || 0),
    ])
  );

  let subtotal = 0;
  const specialPriceAdjustments = [];
  for (let index = 0; index < unitCount; index += 1) {
    const date = new Date(duration.start.getTime() + index * DAY_MS);
    const key = dateKeyUTC(date);
    const dailySpecial = Number(specialPriceMap.get(key) || 0);
    const effectiveRate =
      dailySpecial > 0
        ? unit === PRICING_UNIT.NIGHT
          ? roundMoney(dailySpecial * 0.9)
          : roundMoney(dailySpecial)
        : selectedRate;

    subtotal += effectiveRate;
    if (dailySpecial > 0) {
      specialPriceAdjustments.push({
        date: key,
        amount: effectiveRate,
      });
    }
  }

  return {
    subtotal: roundMoney(subtotal),
    specialPriceAdjustments,
  };
};

const calculateListingQuote = ({
  apartment,
  checkIn,
  checkOut,
  guestsCount,
  bookingUnit = PRICING_UNIT.NIGHT,
  couponCode = "",
  paymentMethod = "any",
  membership = null,
  loyaltyPointsToRedeem = 0,
  loyaltyBalance = 0,
}) => {
  if (!apartment) throw new Error("Apartment is required for quote calculation.");

  const isPremium = isPremiumMembershipActive(membership);
  if (apartment.premium?.isExclusive && !isPremium) {
    throw new Error("This property is exclusive to Premium guests.");
  }

  const requestedUnit = String(bookingUnit || PRICING_UNIT.NIGHT)
    .trim()
    .toLowerCase();

  if (!PUBLIC_BOOKING_UNITS.has(requestedUnit)) {
    throw new Error(
      requestedUnit === PRICING_UNIT.DAY
        ? "Daily booking is no longer available. Please choose Hour, Night, Week or Month."
        : "Please select a valid booking unit."
    );
  }

  const unit = normalizeBookingUnit(requestedUnit);
  const preferredPaymentMethod = normalizePaymentMethod(paymentMethod);
  const pricing = apartment.pricing || {};
  const rates = resolveListingRates(apartment);
  const selectedRate = toPositiveNumber(rates[unit]);

  if (unit === PRICING_UNIT.HOUR && Number(apartment?.policies?.minBookingDays || 1) > 1) {
    throw new Error(
      `Hourly booking is disabled because the Host requires a minimum stay of ${apartment.policies.minBookingDays} days.`
    );
  }

  if (selectedRate <= 0) {
    const propertyName =
      String(apartment.title || apartment._id || "this listing").trim() ||
      "this listing";

    throw new Error(
      `Pricing is missing for ${propertyName}. Please ask the Host to edit the listing and save a valid base pricing reference.`
    );
  }

  const duration = getDuration(checkIn, checkOut);
  validateHostStayPolicy(apartment, duration, unit);
  const unitCount = calculateBillableUnits(checkIn, checkOut, unit);
  const guestCount = Math.max(Number(guestsCount || 1), 1);
  const includedGuests = Math.max(
    Number(pricing.baseGuestCount || apartment.guests || 1),
    1
  );
  const extraGuestCount = Math.max(guestCount - includedGuests, 0);
  const extraGuestFee = Number(pricing.extraGuestFee || 0);
  const specialPricing = calculateSpecialPriceSubtotal({
    apartment,
    duration,
    unit,
    unitCount,
    selectedRate,
  });
  const subtotal = specialPricing.subtotal;
  const extraGuestCharge = roundMoney(extraGuestCount * extraGuestFee * unitCount);
  const cleaningFee = roundMoney(pricing.cleaningFee || 0);
  const serviceFee = roundMoney(pricing.serviceFee || 0);
  const eligibleAmount = roundMoney(subtotal + extraGuestCharge);

  const availableCoupons = getAvailableCoupons({
    apartment,
    eligibleAmount,
    membership,
    paymentMethod: preferredPaymentMethod,
  });

  const coupon = getActiveCoupon({
    apartment,
    couponCode,
    eligibleAmount,
    membership,
    paymentMethod: preferredPaymentMethod,
  });

  let discountAmount = 0;
  if (coupon) {
    discountAmount =
      coupon.discountType === "percentage"
        ? eligibleAmount * (Number(coupon.discountValue || 0) / 100)
        : Number(coupon.discountValue || 0);

    if (Number(coupon.maxDiscount || 0) > 0) {
      discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
    }

    discountAmount = Math.min(discountAmount, eligibleAmount);
  }
  discountAmount = roundMoney(discountAmount);

  const hostPayableAmount = roundMoney(
    Math.max(eligibleAmount + cleaningFee + serviceFee - discountAmount, 0)
  );
  const membershipDiscount = isPremium
    ? Math.max(
        Number(apartment.premium?.discountPercent || membership.discountPercent || 0),
        0
      )
    : 0;
  const premiumDiscountAmount = roundMoney(
    Math.min(eligibleAmount * (membershipDiscount / 100), hostPayableAmount)
  );
  const amountBeforeLoyalty = roundMoney(
    Math.max(hostPayableAmount - premiumDiscountAmount, 0)
  );
  const maxLoyaltyDiscount =
    amountBeforeLoyalty * (LOYALTY_CONFIG.MAX_REDEMPTION_PERCENT / 100);
  const maxPointsByAmount = Math.floor(
    maxLoyaltyDiscount * LOYALTY_CONFIG.POINTS_PER_RUPEE_DISCOUNT
  );
  const loyaltyPointsUsed = Math.min(
    Math.max(Math.floor(Number(loyaltyPointsToRedeem || 0)), 0),
    Math.max(Math.floor(Number(loyaltyBalance || 0)), 0),
    maxPointsByAmount
  );
  const loyaltyDiscountAmount = roundMoney(
    loyaltyPointsUsed / LOYALTY_CONFIG.POINTS_PER_RUPEE_DISCOUNT
  );
  const totalAmount = roundMoney(
    Math.max(amountBeforeLoyalty - loyaltyDiscountAmount, 0)
  );
  const platformDiscountAmount = roundMoney(
    premiumDiscountAmount + loyaltyDiscountAmount
  );
  const totalNights = Math.max(Math.ceil(duration.difference / DAY_MS), 1);
  const unitSavingsPercent = calculateUnitSavings({
    rates,
    bookingUnit: unit,
    unitCount,
    duration,
  });

  return {
    basePrice: selectedRate,
    priceUnit: unit,
    bookingUnit: unit,
    unitCount,
    durationHours: roundMoney(duration.hours),
    pricePerNight: rates.night,
    totalNights,
    availableRates: rates,
    unitSavingsPercent,
    specialPriceAdjustments: specialPricing.specialPriceAdjustments,
    subtotal,
    includedGuests,
    extraGuestCount,
    extraGuestFee,
    extraGuestCharge,
    cleaningFee,
    serviceFee,
    couponCode: coupon?.code || "",
    couponLabel: coupon?.label || coupon?.code || "",
    couponPaymentMethod: normalizePaymentMethod(coupon?.paymentMethod),
    preferredPaymentMethod,
    discountAmount,
    premiumDiscountAmount,
    loyaltyPointsUsed,
    loyaltyDiscountAmount,
    hostPayableAmount,
    platformDiscountAmount,
    totalAmount,
    currency: pricing.currency || "INR",
    isPremium,
    premiumDiscountPercent: membershipDiscount,
    availableCoupons,
  };
};

module.exports = {
  calculateBillableUnits,
  calculateListingQuote,
  getAvailableCoupons,
  normalizeBookingUnit,
  normalizePaymentMethod,
  resolveListingRates,
  validateHostStayPolicy,
};