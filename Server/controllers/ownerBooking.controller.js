const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");

const Booking = require("../models/booking.model");
const Payment = require("../models/payment.model");
const User = require("../models/user.model");
const Apartment = require("../models/apartment.model");
const sendResponse = require("../utils/sendResponse");

const escapeRegex = (value = "") => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const buildDateQuery = (from, to) => {
  const createdAt = {};

  if (from) {
    const start = new Date(from);

    if (!Number.isNaN(start.getTime())) {
      start.setHours(0, 0, 0, 0);
      createdAt.$gte = start;
    }
  }

  if (to) {
    const end = new Date(to);

    if (!Number.isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999);
      createdAt.$lte = end;
    }
  }

  return Object.keys(createdAt).length ? createdAt : null;
};

const createSyntheticHistory = (booking, payments) => {
  const history = Array.isArray(booking.history)
    ? booking.history.map((item) => ({ ...item }))
    : [];

  const hasType = (type) => history.some((item) => item.type === type);

  if (!hasType("booking_created")) {
    history.push({
      type: "booking_created",
      title: "Booking created",
      description: "Guest created this booking.",
      status: "pending",
      paymentStatus: "pending",
      changedBy: booking.guest,
      changedAt: booking.createdAt,
    });
  }

  payments.forEach((payment) => {
    const orderType = `payment_order_${payment._id}`;

    if (!hasType(orderType)) {
      history.push({
        type: orderType,
        title: "Payment order created",
        description: `Razorpay order ${payment.razorpayOrderId} created.`,
        status: booking.status,
        paymentStatus: payment.status === "success" ? "paid" : payment.status,
        changedBy: payment.user,
        changedAt: payment.createdAt,
      });
    }

    if (payment.status === "success") {
      const successType = `payment_success_${payment._id}`;

      if (!hasType(successType)) {
        history.push({
          type: successType,
          title: "Payment successful",
          description: payment.razorpayPaymentId
            ? `Payment ID: ${payment.razorpayPaymentId}`
            : "Payment verified successfully.",
          status: "confirmed",
          paymentStatus: "paid",
          changedBy: payment.user,
          changedAt: payment.paidAt || payment.updatedAt,
        });
      }
    }
  });

  if (booking.cancellation?.cancelledAt && !hasType("booking_cancelled")) {
    history.push({
      type: "booking_cancelled",
      title: "Booking cancelled",
      description: booking.cancellation.reason || "Booking was cancelled.",
      status: "cancelled",
      paymentStatus: booking.paymentStatus,
      changedBy: booking.cancellation.cancelledBy,
      changedAt: booking.cancellation.cancelledAt,
    });
  }

  return history.sort(
    (first, second) =>
      new Date(first.changedAt || 0).getTime() -
      new Date(second.changedAt || 0).getTime()
  );
};

// ======================================
// View All Bookings
// GET /api/owner/bookings
// ======================================
const getBookings = asyncHandler(async (req, res) => {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(
    Math.max(Number.parseInt(req.query.limit, 10) || 10, 1),
    50
  );

  const status = [
    "all",
    "pending",
    "confirmed",
    "completed",
    "cancelled",
  ].includes(req.query.status)
    ? req.query.status
    : "all";

  const paymentStatus = [
    "all",
    "pending",
    "paid",
    "failed",
    "refunded",
  ].includes(req.query.paymentStatus)
    ? req.query.paymentStatus
    : "all";

  const search = String(req.query.search || "").trim();
  const sortBy = String(req.query.sortBy || "newest");
  const query = { isDeleted: false };

  if (status !== "all") {
    query.status = status;
  }

  if (paymentStatus !== "all") {
    query.paymentStatus = paymentStatus;
  }

  const createdAt = buildDateQuery(req.query.from, req.query.to);

  if (createdAt) {
    query.createdAt = createdAt;
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");

    const [userIds, apartmentIds] = await Promise.all([
      User.find({
        $or: [{ name: regex }, { email: regex }, { phone: regex }],
      }).distinct("_id"),

      Apartment.find({
        $or: [
          { title: regex },
          { "location.city": regex },
          { "location.state": regex },
          { "location.address": regex },
        ],
      }).distinct("_id"),
    ]);

    query.$or = [
      { guest: { $in: userIds } },
      { host: { $in: userIds } },
      { apartment: { $in: apartmentIds } },
    ];

    if (mongoose.isValidObjectId(search)) {
      query.$or.push({ _id: search });
    }
  }

  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    checkin_soon: { checkIn: 1 },
    amount_high: { "pricing.totalAmount": -1 },
    amount_low: { "pricing.totalAmount": 1 },
  };

  const skip = (page - 1) * limit;

  const [bookings, total, pending, confirmed, completed, cancelled] =
    await Promise.all([
      Booking.find(query)
        .populate("guest", "name email phone avatar")
        .populate("host", "name email phone avatar")
        .populate("apartment", "title images location status pricing")
        .sort(sortMap[sortBy] || sortMap.newest)
        .skip(skip)
        .limit(limit)
        .lean(),

      Booking.countDocuments(query),
      Booking.countDocuments({ status: "pending", isDeleted: false }),
      Booking.countDocuments({ status: "confirmed", isDeleted: false }),
      Booking.countDocuments({ status: "completed", isDeleted: false }),
      Booking.countDocuments({ status: "cancelled", isDeleted: false }),
    ]);

  return sendResponse(res, 200, true, "Bookings fetched successfully.", {
    bookings,
    summary: {
      total: pending + confirmed + completed + cancelled,
      pending,
      confirmed,
      completed,
      cancelled,
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
    filters: {
      search,
      status,
      paymentStatus,
      from: req.query.from || "",
      to: req.query.to || "",
      sortBy,
    },
  });
});

// ======================================
// View Booking Details / History
// GET /api/owner/bookings/:bookingId
// ======================================
const getBookingDetails = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.bookingId)) {
    return sendResponse(res, 400, false, "Invalid booking ID.");
  }

  const booking = await Booking.findOne({
    _id: req.params.bookingId,
    isDeleted: false,
  })
    .populate("guest", "name email phone avatar role status createdAt")
    .populate("host", "name email phone avatar role status createdAt")
    .populate(
      "apartment",
      "title slug images location pricing propertyType guests bedrooms beds bathrooms status host"
    )
    .populate("cancellation.cancelledBy", "name email role")
    .populate("history.changedBy", "name email role")
    .lean();

  if (!booking) {
    return sendResponse(res, 404, false, "Booking not found.");
  }

  const payments = await Payment.find({
    booking: booking._id,
    isDeleted: false,
  })
    .populate("user", "name email role")
    .sort({ createdAt: 1 })
    .lean();

  const history = createSyntheticHistory(booking, payments);

  return sendResponse(res, 200, true, "Booking details fetched successfully.", {
    booking,
    payments,
    history,
  });
});

module.exports = {
  getBookings,
  getBookingDetails,
};

