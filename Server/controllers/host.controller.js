const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");

const Apartment = require("../models/apartment.model");
const Booking = require("../models/booking.model");
const Payment = require("../models/payment.model");
const APARTMENT_STATUS = require("../constants/apartmentStatus");
const sendResponse = require("../utils/sendResponse");

const createMonthBuckets = () => {
  const now = new Date();
  const buckets = [];

  for (let offset = 11; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    buckets.push({
      key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
      month: date.toLocaleString("en-IN", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      }),
      revenue: 0,
      bookings: 0,
    });
  }

  return buckets;
};

const getDashboardStats = asyncHandler(async (req, res) => {
  const hostId = new mongoose.Types.ObjectId(req.user._id);
  const buckets = createMonthBuckets();
  const first = buckets[0].key.split("-");
  const trendStart = new Date(Date.UTC(Number(first[0]), Number(first[1]) - 1, 1));

  const [
    totalListings,
    activeListings,
    pendingListings,
    suspendedListings,
    totalBookings,
    earningsRows,
    monthlyRows,
    recentListings,
    recentBookings,
  ] = await Promise.all([
    Apartment.countDocuments({ host: hostId, isDeleted: false }),
    Apartment.countDocuments({
      host: hostId,
      status: APARTMENT_STATUS.APPROVED,
      isDeleted: false,
    }),
    Apartment.countDocuments({
      host: hostId,
      status: APARTMENT_STATUS.PENDING,
      isDeleted: false,
    }),
    Apartment.countDocuments({
      host: hostId,
      status: APARTMENT_STATUS.SUSPENDED,
      isDeleted: false,
    }),
    Booking.countDocuments({ host: hostId, isDeleted: false }),
    Payment.aggregate([
      { $match: { status: "success", isDeleted: { $ne: true } } },
      {
        $lookup: {
          from: "bookings",
          localField: "booking",
          foreignField: "_id",
          as: "bookingData",
        },
      },
      { $unwind: "$bookingData" },
      { $match: { "bookingData.host": hostId, "bookingData.isDeleted": { $ne: true } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$bookingData.hostShare", { $ifNull: ["$bookingData.hostShare", { $ifNull: ["$bookingData.pricing.hostPayableAmount", "$amount"] }] }] } } } },
    ]),
    Payment.aggregate([
      { $match: { status: "success", isDeleted: { $ne: true } } },
      {
        $lookup: {
          from: "bookings",
          localField: "booking",
          foreignField: "_id",
          as: "bookingData",
        },
      },
      { $unwind: "$bookingData" },
      {
        $match: {
          "bookingData.host": hostId,
          "bookingData.isDeleted": { $ne: true },
          paidAt: { $gte: trendStart },
        },
      },
      {
        $group: {
          _id: { year: { $year: "$paidAt" }, month: { $month: "$paidAt" } },
          revenue: { $sum: { $ifNull: ["$bookingData.hostShare", { $ifNull: ["$bookingData.hostShare", { $ifNull: ["$bookingData.pricing.hostPayableAmount", "$amount"] }] }] } },
          bookings: { $sum: 1 },
        },
      },
    ]),
    Apartment.find({ host: hostId, isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(6)
      .select("title images location propertyType pricing status views bookingCount createdAt"),
    Booking.find({ host: hostId, isDeleted: false })
      .populate("guest", "name email avatar")
      .populate("apartment", "title images")
      .sort({ createdAt: -1 })
      .limit(6),
  ]);

  const monthlyMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  monthlyRows.forEach((row) => {
    const key = `${row._id.year}-${String(row._id.month).padStart(2, "0")}`;
    if (monthlyMap.has(key)) {
      monthlyMap.get(key).revenue = Number(row.revenue || 0);
      monthlyMap.get(key).bookings = Number(row.bookings || 0);
    }
  });

  const totalEarnings = Number(earningsRows[0]?.total || 0);
  const monthlyRevenue = Array.from(monthlyMap.values());

  return sendResponse(res, 200, true, "Host dashboard fetched successfully.", {
    overview: {
      totalListings,
      activeListings,
      pendingListings,
      suspendedListings,
      totalBookings,
      totalEarnings,
      currency: "INR",
    },
    monthlyRevenue,
    recentListings,
    recentBookings,

    // Legacy keys keep old UI/API consumers safe.
    totalApartments: totalListings,
    approved: activeListings,
    pending: pendingListings,
    suspended: suspendedListings,
    rejected: 0,
    inactive: 0,
  });
});

const getMyApartments = asyncHandler(async (req, res) => {
  const apartments = await Apartment.find({
    host: req.user._id,
    isDeleted: false,
  }).sort({ createdAt: -1 });

  return sendResponse(res, 200, true, "Host apartments fetched successfully.", apartments);
});

const getApartmentsByStatus = (status, message) =>
  asyncHandler(async (req, res) => {
    const apartments = await Apartment.find({
      host: req.user._id,
      status,
      isDeleted: false,
    }).sort({ createdAt: -1 });

    return sendResponse(res, 200, true, message, apartments);
  });

module.exports = {
  getDashboardStats,
  getMyApartments,
  getPendingApartments: getApartmentsByStatus(
    APARTMENT_STATUS.PENDING,
    "Pending apartments fetched successfully."
  ),
  getApprovedApartments: getApartmentsByStatus(
    APARTMENT_STATUS.APPROVED,
    "Approved apartments fetched successfully."
  ),
  getRejectedApartments: getApartmentsByStatus(
    APARTMENT_STATUS.REJECTED,
    "Rejected apartments fetched successfully."
  ),
  getInactiveApartments: getApartmentsByStatus(
    APARTMENT_STATUS.INACTIVE,
    "Inactive apartments fetched successfully."
  ),
  getSuspendedApartments: getApartmentsByStatus(
    APARTMENT_STATUS.SUSPENDED,
    "Suspended apartments fetched successfully."
  ),
};