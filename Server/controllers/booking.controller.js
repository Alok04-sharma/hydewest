const asyncHandler = require("express-async-handler");

const Booking = require("../models/booking.model");
const Apartment = require("../models/apartment.model");
const APARTMENT_STATUS = require("../constants/apartmentStatus");
const sendResponse = require("../utils/sendResponse");
const {
  calculateListingQuote,
  normalizeBookingUnit,
} = require("../services/listingPricing.service");
const NOTIFICATION_TYPE = require("../constants/notificationType");
const {
  createUserNotification,
} = require("../services/notification.service");
const {
  getActiveGuestMembership,
} = require("../services/guestMembership.service");

const DAY_MS = 24 * 60 * 60 * 1000;

const BOOKING_STATUS = Object.freeze({
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
});

const loadOptionalLoyaltyService = () => {
  try {
    // Loyalty was added in the Guest module. Keeping it optional makes the
    // booking flow backward-compatible while the new files are being copied.
    // eslint-disable-next-line global-require
    return require("../services/loyalty.service");
  } catch {
    return null;
  }
};

const loyaltyService = loadOptionalLoyaltyService();

const normalizeDates = (checkIn, checkOut) => {
  const startDate = new Date(checkIn);
  const endDate = new Date(checkOut);

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    endDate <= startDate
  ) {
    throw new Error("Check-out must be after check-in.");
  }

  return { startDate, endDate };
};

const endOfAvailabilityDay = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(23, 59, 59, 999);
  return date;
};

const validateBookingRules = async ({
  apartment,
  startDate,
  endDate,
  guestsCount,
  bookingUnit,
  ignoreBookingId = null,
}) => {
  const now = new Date();

  if (startDate < new Date(now.getTime() - 5 * 60 * 1000)) {
    throw new Error("Check-in cannot be in the past.");
  }

  const guestCount = Number(guestsCount || 1);

  if (
    !Number.isFinite(guestCount) ||
    guestCount < 1 ||
    guestCount > Number(apartment.guests || 1)
  ) {
    throw new Error(
      `This property allows a maximum of ${apartment.guests || 1} guest(s).`
    );
  }

  const durationHours = (endDate.getTime() - startDate.getTime()) / 3600000;
  const minimumDays = Math.max(
    Number(apartment.policies?.minBookingDays || 1),
    1
  );
  const maximumDays = Math.max(
    Number(apartment.policies?.maxBookingDays || 365),
    minimumDays
  );
  const normalizedUnit = normalizeBookingUnit(bookingUnit);
  const minimumHours =
    normalizedUnit === "hour" && minimumDays === 1
      ? 1
      : minimumDays * 24;

  if (durationHours + Number.EPSILON < minimumHours) {
    throw new Error(
      `The Host requires a minimum stay of ${minimumDays} day(s) for this property.`
    );
  }

  if (durationHours - Number.EPSILON > maximumDays * 24) {
    throw new Error(
      `The Host allows a maximum stay of ${maximumDays} day(s) for this property.`
    );
  }

  if (
    apartment.availability?.availableFrom &&
    startDate < new Date(apartment.availability.availableFrom)
  ) {
    throw new Error("The property is not available from this check-in date.");
  }

  const availableTo = apartment.availability?.availableTo
    ? endOfAvailabilityDay(apartment.availability.availableTo)
    : null;

  if (availableTo && endDate > availableTo) {
    throw new Error("The property is not available through this check-out date.");
  }

  const hasBlockedDate = (apartment.availability?.blockedDates || []).some(
    (value) => {
      const blockedDate = new Date(value);
      return blockedDate >= startDate && blockedDate < endDate;
    }
  );

  if (hasBlockedDate) {
    throw new Error("One or more selected dates are blocked by the Host.");
  }

  const overlapQuery = {
    apartment: apartment._id,
    isDeleted: false,
    status: {
      $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED],
    },
    checkIn: { $lt: endDate },
    checkOut: { $gt: startDate },
  };

  if (ignoreBookingId) {
    overlapQuery._id = { $ne: ignoreBookingId };
  }

  if (await Booking.exists(overlapQuery)) {
    throw new Error("Selected dates are no longer available.");
  }
};

const getLoyaltyContext = async (guestId) => {
  if (!loyaltyService?.getOrCreateAccount) {
    return {
      account: { balance: 0 },
      calculatePointsForSpend: () => 0,
    };
  }

  const account = await loyaltyService.getOrCreateAccount(guestId);

  return {
    account,
    calculatePointsForSpend:
      loyaltyService.calculatePointsForSpend || (() => 0),
  };
};

const buildQuote = async ({ guestId, apartment, body }) => {
  const [membership, loyaltyContext] = await Promise.all([
    getActiveGuestMembership(guestId),
    getLoyaltyContext(guestId),
  ]);

  const quote = calculateListingQuote({
    apartment,
    checkIn: body.checkIn,
    checkOut: body.checkOut,
    guestsCount: body.guestsCount,
    bookingUnit: body.bookingUnit,
    couponCode: body.couponCode,
    paymentMethod: body.paymentMethod,
    membership,
    loyaltyPointsToRedeem: body.loyaltyPointsToRedeem,
    loyaltyBalance: loyaltyContext.account.balance,
  });

  const expectedPoints = loyaltyContext.calculatePointsForSpend(
    quote.totalAmount,
    membership
  );

  return {
    quote,
    membership,
    loyaltyAccount: loyaltyContext.account,
    expectedPoints,
  };
};

const findAvailableApartment = (apartmentId) =>
  Apartment.findOne({
    _id: apartmentId,
    status: APARTMENT_STATUS.APPROVED,
    isDeleted: false,
  });

const getBookingQuote = asyncHandler(async (req, res) => {
  const apartment = await findAvailableApartment(req.body.apartmentId);

  if (!apartment) {
    return sendResponse(res, 404, false, "Apartment not available.");
  }

  try {
    const { startDate, endDate } = normalizeDates(
      req.body.checkIn,
      req.body.checkOut
    );

    await validateBookingRules({
      apartment,
      startDate,
      endDate,
      guestsCount: req.body.guestsCount,
      bookingUnit: req.body.bookingUnit,
    });

    const result = await buildQuote({
      guestId: req.user._id,
      apartment,
      body: {
        ...req.body,
        checkIn: startDate,
        checkOut: endDate,
      },
    });

    return sendResponse(res, 200, true, "Booking quote calculated.", {
      ...result.quote,
      expectedPoints: result.expectedPoints,
      loyaltyBalance: Number(result.loyaltyAccount?.balance || 0),
      minimumStayDays: Number(apartment.policies?.minBookingDays || 1),
      maximumStayDays: Number(apartment.policies?.maxBookingDays || 365),
      membership: result.membership,
    });
  } catch (error) {
    return sendResponse(res, 400, false, error.message);
  }
});

const createBooking = asyncHandler(async (req, res) => {
  const apartment = await findAvailableApartment(req.body.apartmentId);

  if (!apartment) {
    return sendResponse(res, 404, false, "Apartment not available.");
  }

  let startDate;
  let endDate;
  let result;

  try {
    ({ startDate, endDate } = normalizeDates(
      req.body.checkIn,
      req.body.checkOut
    ));

    await validateBookingRules({
      apartment,
      startDate,
      endDate,
      guestsCount: req.body.guestsCount,
      bookingUnit: req.body.bookingUnit,
    });

    result = await buildQuote({
      guestId: req.user._id,
      apartment,
      body: {
        ...req.body,
        checkIn: startDate,
        checkOut: endDate,
      },
    });
  } catch (error) {
    return sendResponse(res, 400, false, error.message);
  }

  const isPremium = Boolean(result.membership);

  const booking = await Booking.create({
    guest: req.user._id,
    apartment: apartment._id,
    host: apartment.host,
    checkIn: startDate,
    checkOut: endDate,
    guestsCount: Number(req.body.guestsCount || 1),
    pricing: result.quote,
    membershipSnapshot: {
      isPremium,
      planCode: result.membership?.planCode || "",
      discountPercent: result.quote.premiumDiscountPercent || 0,
      benefits: result.membership?.benefits || [],
    },
    loyalty: {
      expectedPoints: result.expectedPoints,
    },
    insurance: {
      enabled: Boolean(req.body.bookingInsurance && isPremium),
      premiumAmount: 0,
      coverageType:
        req.body.bookingInsurance && isPremium
          ? "premium_protection"
          : "",
    },
    priorityScore: isPremium ? 100 : 0,
    status: BOOKING_STATUS.PENDING,
    paymentStatus: "pending",
    message: String(req.body.message || "").trim(),
    history: [
      {
        type: "booking_created",
        title: "Booking created",
        description: result.quote.couponCode
          ? `Booking created using coupon ${result.quote.couponCode}. Payment is pending.`
          : "Booking created and payment is pending.",
        status: BOOKING_STATUS.PENDING,
        paymentStatus: "pending",
        changedBy: req.user._id,
        changedAt: new Date(),
      },
    ],
  });

  if (
    result.quote.loyaltyPointsUsed > 0 &&
    loyaltyService?.redeemBookingPoints
  ) {
    try {
      await loyaltyService.redeemBookingPoints({
        guestId: req.user._id,
        bookingId: booking._id,
        points: result.quote.loyaltyPointsUsed,
        discountAmount: result.quote.loyaltyDiscountAmount,
      });

      booking.loyalty.redemptionRecorded = true;
      await booking.save();
    } catch (error) {
      await Booking.deleteOne({ _id: booking._id });
      return sendResponse(res, 409, false, error.message);
    }
  }

  await createUserNotification({
    recipient: apartment.host,
    type: NOTIFICATION_TYPE.NEW_BOOKING,
    title: isPremium
      ? "New priority Premium booking"
      : "New booking request",
    message: `A guest requested ${apartment.title} from ${startDate.toLocaleString()} to ${endDate.toLocaleString()}.`,
    actor: req.user._id,
    entityType: "Booking",
    entityId: booking._id,
    actionUrl: `/host/bookings/${booking._id}`,
    eventKey: `new-booking-${booking._id}`,
    metadata: {
      isPremium,
      bookingUnit: result.quote.bookingUnit,
      unitCount: result.quote.unitCount,
    },
  });

  return sendResponse(
    res,
    201,
    true,
    "Booking created successfully.",
    booking
  );
});

const classifyBooking = (booking, now = new Date()) => {
  if (booking.status === BOOKING_STATUS.CANCELLED) return "cancelled";
  if (
    booking.status === BOOKING_STATUS.COMPLETED ||
    new Date(booking.checkOut) <= now
  ) {
    return "completed";
  }
  if (
    booking.status === BOOKING_STATUS.CONFIRMED &&
    new Date(booking.checkIn) <= now &&
    new Date(booking.checkOut) > now
  ) {
    return "current";
  }
  return "upcoming";
};

const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({
    guest: req.user._id,
    isDeleted: false,
  })
    .populate(
      "apartment",
      "title images location pricing status propertyType premium policies"
    )
    .populate("host", "name avatar phone email")
    .sort({ createdAt: -1 })
    .lean();

  const now = new Date();

  return sendResponse(res, 200, true, "Bookings fetched successfully.", {
    all: bookings,
    upcoming: bookings.filter((item) => classifyBooking(item, now) === "upcoming"),
    current: bookings.filter((item) => classifyBooking(item, now) === "current"),
    completed: bookings.filter((item) => classifyBooking(item, now) === "completed"),
    cancelled: bookings.filter((item) => classifyBooking(item, now) === "cancelled"),
  });
});

const getMyBookingDetails = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    guest: req.user._id,
    isDeleted: false,
  })
    .populate(
      "apartment",
      "title images location pricing policies amenities houseRules propertyType status"
    )
    .populate("host", "name avatar phone email");

  if (!booking) {
    return sendResponse(res, 404, false, "Booking not found.");
  }

  return sendResponse(res, 200, true, "Booking details fetched.", booking);
});

const getHostBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({
    host: req.user._id,
    isDeleted: false,
  })
    .populate("guest", "name email avatar phone")
    .populate("apartment", "title images location status pricing policies")
    .sort({ priorityScore: -1, createdAt: -1 });

  return sendResponse(
    res,
    200,
    true,
    "Host bookings fetched successfully.",
    bookings
  );
});

const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    guest: req.user._id,
    isDeleted: false,
  });

  if (!booking) {
    return sendResponse(res, 404, false, "Booking not found.");
  }

  if (booking.status === BOOKING_STATUS.CANCELLED) {
    return sendResponse(res, 400, false, "Booking already cancelled.");
  }

  if (booking.status === BOOKING_STATUS.COMPLETED) {
    return sendResponse(res, 400, false, "Completed booking cannot be cancelled.");
  }

  const membership = await getActiveGuestMembership(req.user._id);
  const cancellationWindowHours = membership ? 48 : 24;
  const hoursUntilCheckIn =
    (new Date(booking.checkIn).getTime() - Date.now()) / 3600000;
  const refundEligible = hoursUntilCheckIn >= cancellationWindowHours;
  const reason = String(req.body.reason || "Cancelled by guest").trim();

  booking.status = BOOKING_STATUS.CANCELLED;
  booking.cancellation = {
    cancelledBy: req.user._id,
    cancelledAt: new Date(),
    reason,
    refundEligible,
    cancellationWindowHours,
  };
  booking.history.push({
    type: "booking_cancelled",
    title: "Booking cancelled",
    description: reason,
    status: BOOKING_STATUS.CANCELLED,
    paymentStatus: booking.paymentStatus,
    changedBy: req.user._id,
    changedAt: new Date(),
  });

  await booking.save();

  if (
    booking.loyalty?.redemptionRecorded &&
    loyaltyService?.restoreBookingRedemption
  ) {
    await loyaltyService.restoreBookingRedemption({
      guestId: req.user._id,
      bookingId: booking._id,
    });
  }

  if (booking.loyalty?.rewardRecorded && loyaltyService?.reverseBookingReward) {
    await loyaltyService.reverseBookingReward({
      guestId: req.user._id,
      bookingId: booking._id,
    });
  }

  await createUserNotification({
    recipient: booking.host,
    type: NOTIFICATION_TYPE.BOOKING_CANCELLED,
    title: "Booking cancelled by Guest",
    message: reason,
    actor: req.user._id,
    entityType: "Booking",
    entityId: booking._id,
    actionUrl: `/host/bookings/${booking._id}`,
    eventKey: `guest-cancelled-${booking._id}`,
  });

  return sendResponse(res, 200, true, "Booking cancelled successfully.", {
    booking,
    refundEligible,
    cancellationWindowHours,
  });
});

module.exports = {
  getBookingQuote,
  createBooking,
  getMyBookings,
  getMyBookingDetails,
  getHostBookings,
  cancelBooking,
};