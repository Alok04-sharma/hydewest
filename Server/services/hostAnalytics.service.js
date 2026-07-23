const mongoose = require("mongoose");
const Booking = require("../models/booking.model");
const Payment = require("../models/payment.model");

const hostRevenueMatch = (hostId) => [
  { $match: { status: "success", isDeleted: { $ne: true } } },
  { $lookup: { from: "bookings", localField: "booking", foreignField: "_id", as: "bookingData" } },
  { $unwind: "$bookingData" },
  { $match: { "bookingData.host": new mongoose.Types.ObjectId(hostId), "bookingData.isDeleted": { $ne: true } } },
];

const getRevenueOverview = async (hostId) => {
  const now = new Date();
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const previousStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

  const [totals, monthly, propertyWise, bookingStats] = await Promise.all([
    Payment.aggregate([...hostRevenueMatch(hostId), { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
    Payment.aggregate([
      ...hostRevenueMatch(hostId),
      { $match: { paidAt: { $gte: yearStart } } },
      { $group: { _id: { year: { $year: "$paidAt" }, month: { $month: "$paidAt" } }, revenue: { $sum: "$amount" }, bookings: { $sum: 1 } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
    Payment.aggregate([
      ...hostRevenueMatch(hostId),
      { $lookup: { from: "apartments", localField: "bookingData.apartment", foreignField: "_id", as: "apartmentData" } },
      { $unwind: "$apartmentData" },
      { $group: { _id: "$apartmentData._id", title: { $first: "$apartmentData.title" }, cover: { $first: { $arrayElemAt: ["$apartmentData.images", 0] } }, revenue: { $sum: "$amount" }, bookings: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
    ]),
    Booking.aggregate([
      { $match: { host: new mongoose.Types.ObjectId(hostId), isDeleted: false } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const monthMap = new Map();
  for (let offset = 11; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const key = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`;
    monthMap.set(key, { key, month: date.toLocaleString("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" }), revenue: 0, bookings: 0 });
  }
  monthly.forEach((row) => {
    const key = `${row._id.year}-${row._id.month}`;
    if (monthMap.has(key)) Object.assign(monthMap.get(key), { revenue: row.revenue, bookings: row.bookings });
  });

  const values = Array.from(monthMap.values());
  const currentMonthRevenue = values[values.length - 1]?.revenue || 0;
  const previousMonthRevenue = values[values.length - 2]?.revenue || 0;
  const growth = previousMonthRevenue > 0 ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 : currentMonthRevenue > 0 ? 100 : 0;

  return {
    overview: { totalRevenue: totals[0]?.total || 0, successfulBookings: totals[0]?.count || 0, currentMonthRevenue, previousMonthRevenue, monthlyGrowth: Number(growth.toFixed(1)), currency: "INR", monthStart, previousStart },
    monthlyRevenue: values,
    propertyWise,
    bookingStatistics: bookingStats.reduce((acc, row) => ({ ...acc, [row._id]: row.count }), {}),
  };
};

module.exports = { getRevenueOverview };