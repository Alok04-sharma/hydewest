const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Booking = require("../models/booking.model");
const Apartment = require("../models/apartment.model");
const Notification = require("../models/notification.model");
const sendResponse = require("../utils/sendResponse");
const NOTIFICATION_TYPE = require("../constants/notificationType");
const { createUserNotification } = require("../services/notification.service");
const { getRevenueOverview } = require("../services/hostAnalytics.service");

const safeBookingPopulate = [
  { path: "guest", select: "name email avatar phone role" },
  { path: "apartment", select: "title images location propertyType pricing status" },
];

const getDateCategory = (booking, now = new Date()) => {
  if (booking.status === "pending") return "requests";
  if (booking.status === "completed") return "completed";
  if (booking.status === "cancelled") return "cancelled";
  if (booking.status === "confirmed" && booking.checkIn > now) return "upcoming";
  if (booking.status === "confirmed" && booking.checkIn <= now && booking.checkOut > now) return "ongoing";
  if (booking.status === "confirmed" && booking.checkOut <= now) return "completed";
  return booking.status;
};

const getHostBookings = asyncHandler(async (req, res) => {
  const { category = "all", search = "" } = req.query;
  const bookings = await Booking.find({ host: req.user._id, isDeleted: false })
    .populate(safeBookingPopulate)
    .sort({ priorityScore: -1, createdAt: -1 });

  const needle = String(search).trim().toLowerCase();
  const data = bookings.filter((booking) => {
    const matchesCategory = category === "all" || getDateCategory(booking) === category;
    const haystack = `${booking.apartment?.title || ""} ${booking.guest?.name || ""} ${booking.guest?.email || ""}`.toLowerCase();
    return matchesCategory && (!needle || haystack.includes(needle));
  });

  const summary = bookings.reduce(
    (acc, booking) => {
      const key = getDateCategory(booking);
      acc.all += 1;
      if (Object.prototype.hasOwnProperty.call(acc, key)) acc[key] += 1;
      return acc;
    },
    { all: 0, requests: 0, upcoming: 0, ongoing: 0, completed: 0, cancelled: 0 }
  );

  return sendResponse(res, 200, true, "Host bookings fetched successfully.", { bookings: data, summary });
});

const getHostBookingDetails = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, host: req.user._id, isDeleted: false })
    .populate(safeBookingPopulate)
    .populate("history.changedBy", "name role avatar");
  if (!booking) return sendResponse(res, 404, false, "Booking not found.");
  return sendResponse(res, 200, true, "Booking details fetched successfully.", booking);
});

const updateBookingStatus = asyncHandler(async (req, res) => {
  const status = String(req.body.status || "").toLowerCase();
  if (!["confirmed", "cancelled", "completed"].includes(status)) {
    return sendResponse(res, 400, false, "Invalid booking status.");
  }

  const booking = await Booking.findOne({ _id: req.params.id, host: req.user._id, isDeleted: false });
  if (!booking) return sendResponse(res, 404, false, "Booking not found.");
  if (["cancelled", "completed"].includes(booking.status)) {
    return sendResponse(res, 400, false, `This booking is already ${booking.status}.`);
  }

  booking.status = status;
  booking.hostDecisionAt = new Date();
  if (status === "cancelled") {
    booking.cancellation = { cancelledBy: req.user._id, cancelledAt: new Date(), reason: String(req.body.reason || "Declined by host") };
  }
  booking.history.push({
    type: `booking_${status}`,
    title: `Booking ${status}`,
    description: String(req.body.reason || `Host marked booking as ${status}.`),
    status,
    paymentStatus: booking.paymentStatus,
    changedBy: req.user._id,
    changedAt: new Date(),
  });
  await booking.save();

  await createUserNotification({
    recipient: booking.guest,
    type: status === "confirmed" ? NOTIFICATION_TYPE.BOOKING_CONFIRMED : NOTIFICATION_TYPE.BOOKING_CANCELLED,
    title: status === "confirmed" ? "Booking confirmed" : "Booking update",
    message: status === "confirmed" ? "Your host confirmed the booking." : `Your booking was ${status}.`,
    actor: req.user._id,
    entityType: "Booking",
    entityId: booking._id,
    actionUrl: `/guest/bookings/${booking._id}`,
    eventKey: `guest-booking-${booking._id}-${status}`,
  });

  return sendResponse(res, 200, true, `Booking ${status} successfully.`, booking);
});

const getAvailability = asyncHandler(async (req, res) => {
  const from = req.query.from ? new Date(req.query.from) : new Date();
  const to = req.query.to ? new Date(req.query.to) : new Date(Date.now() + 90 * 86400000);
  const apartments = await Apartment.find({ host: req.user._id, isDeleted: false }).select("title images status location pricing").lean();
  const bookings = await Booking.find({
    host: req.user._id,
    isDeleted: false,
    status: { $in: ["pending", "confirmed"] },
    checkIn: { $lt: to },
    checkOut: { $gt: from },
  }).populate("guest", "name avatar").lean();

  const bookedByProperty = new Map();
  bookings.forEach((booking) => {
    const key = String(booking.apartment);
    if (!bookedByProperty.has(key)) bookedByProperty.set(key, []);
    bookedByProperty.get(key).push(booking);
  });

  const properties = apartments.map((apartment) => {
    const ranges = bookedByProperty.get(String(apartment._id)) || [];
    const currentlyBooked = ranges.some((booking) => booking.status === "confirmed" && booking.checkIn <= new Date() && booking.checkOut > new Date());
    return { ...apartment, availabilityStatus: currentlyBooked ? "booked" : "available", bookings: ranges };
  });

  return sendResponse(res, 200, true, "Property availability fetched successfully.", {
    range: { from, to },
    summary: { available: properties.filter((item) => item.availabilityStatus === "available").length, booked: properties.filter((item) => item.availabilityStatus === "booked").length },
    properties,
  });
});

const getRevenue = asyncHandler(async (req, res) => {
  const data = await getRevenueOverview(req.user._id);
  const recentTransactions = await require("../models/payment.model")
    .find({ status: "success", isDeleted: { $ne: true } })
    .populate({ path: "booking", match: { host: req.user._id }, populate: [{ path: "guest", select: "name avatar" }, { path: "apartment", select: "title images" }] })
    .sort({ paidAt: -1 })
    .limit(30)
    .lean();
  data.recentTransactions = recentTransactions.filter((item) => item.booking);
  return sendResponse(res, 200, true, "Revenue analytics fetched successfully.", data);
});

const getHostNotificationSnapshot = asyncHandler(async (req, res) => {
  const [unread, latest] = await Promise.all([
    Notification.countDocuments({ recipient: req.user._id, isRead: false, isDeleted: false }),
    Notification.find({ recipient: req.user._id, isDeleted: false }).sort({ createdAt: -1 }).limit(5),
  ]);
  return sendResponse(res, 200, true, "Notification snapshot fetched.", { unread, latest });
});

module.exports = { getHostBookings, getHostBookingDetails, updateBookingStatus, getAvailability, getRevenue, getHostNotificationSnapshot };