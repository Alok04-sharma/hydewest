const asyncHandler = require("express-async-handler");

const Booking = require("../models/booking.model");
const Apartment = require("../models/apartment.model");
const APARTMENT_STATUS = require("../constants/apartmentStatus");
const sendResponse = require("../utils/sendResponse");
const { calculateListingQuote } = require("../services/listingPricing.service");
const NOTIFICATION_TYPE = require("../constants/notificationType");
const { createUserNotification } = require("../services/notification.service");

const BOOKING_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
};

const createBooking = asyncHandler(async (req, res) => {
  const {
    apartmentId,
    checkIn,
    checkOut,
    guestsCount,
    message,
    couponCode,
  } = req.body;

  const apartment = await Apartment.findOne({
    _id: apartmentId,
    status: APARTMENT_STATUS.APPROVED,
    isDeleted: false,
  });

  if (!apartment) {
    return sendResponse(res, 404, false, "Apartment not available.");
  }

  const startDate = new Date(checkIn);
  const endDate = new Date(checkOut);

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    endDate <= startDate
  ) {
    return sendResponse(res, 400, false, "Invalid booking dates.");
  }

  if (Number(guestsCount) > Number(apartment.guests)) {
    return sendResponse(
      res,
      400,
      false,
      `This property allows a maximum of ${apartment.guests} guests.`
    );
  }

  const overlappingBooking = await Booking.exists({
    apartment: apartment._id,
    isDeleted: false,
    status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] },
    checkIn: { $lt: endDate },
    checkOut: { $gt: startDate },
  });

  if (overlappingBooking) {
    return sendResponse(
      res,
      409,
      false,
      "Selected dates are no longer available."
    );
  }

  let pricing;

  try {
    pricing = calculateListingQuote({
      apartment,
      checkIn: startDate,
      checkOut: endDate,
      guestsCount,
      couponCode,
    });
  } catch (error) {
    return sendResponse(res, 400, false, error.message);
  }

  const booking = await Booking.create({
    guest: req.user._id,
    apartment: apartment._id,
    host: apartment.host,
    checkIn: startDate,
    checkOut: endDate,
    guestsCount,
    pricing,
    status: BOOKING_STATUS.PENDING,
    paymentStatus: "pending",
    message,
    history: [
      {
        type: "booking_created",
        title: "Booking created",
        description: pricing.couponCode
          ? `Guest created the booking using coupon ${pricing.couponCode}. Payment is pending.`
          : "Guest created the booking and payment is pending.",
        status: BOOKING_STATUS.PENDING,
        paymentStatus: "pending",
        changedBy: req.user._id,
        changedAt: new Date(),
      },
    ],
  });

  await createUserNotification({
    recipient: apartment.host,
    type: NOTIFICATION_TYPE.NEW_BOOKING,
    title: "New booking request",
    message: `A guest requested ${apartment.title} from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}.`,
    actor: req.user._id,
    entityType: "Booking",
    entityId: booking._id,
    actionUrl: `/host/bookings/${booking._id}`,
    eventKey: `new-booking-${booking._id}`,
  });

  return sendResponse(res, 201, true, "Booking created successfully.", booking);
});

const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({
    guest: req.user._id,
    isDeleted: false,
  })
    .populate("apartment", "title images location pricing status")
    .sort({ createdAt: -1 });

  return sendResponse(res, 200, true, "Bookings fetched successfully.", bookings);
});

const getHostBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({
    host: req.user._id,
    isDeleted: false,
  })
    .populate("guest", "name email avatar phone")
    .populate("apartment", "title images location status pricing")
    .sort({ createdAt: -1 });

  return sendResponse(res, 200, true, "Host bookings fetched successfully.", bookings);
});

const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    guest: req.user._id,
    isDeleted: false,
  });

  if (!booking) return sendResponse(res, 404, false, "Booking not found.");
  if (booking.status === BOOKING_STATUS.CANCELLED) {
    return sendResponse(res, 400, false, "Booking already cancelled.");
  }
  if (booking.status === "completed") {
    return sendResponse(res, 400, false, "Completed booking cannot be cancelled.");
  }

  const reason = String(req.body.reason || "Cancelled by guest").trim();
  booking.status = BOOKING_STATUS.CANCELLED;
  booking.cancellation = {
    cancelledBy: req.user._id,
    cancelledAt: new Date(),
    reason,
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
  return sendResponse(res, 200, true, "Booking cancelled successfully.", booking);
});

module.exports = {
  createBooking,
  getMyBookings,
  getHostBookings,
  cancelBooking,
};