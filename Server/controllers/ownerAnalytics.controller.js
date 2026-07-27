const asyncHandler = require("express-async-handler");
const Revenue = require("../models/revenue.model");
const Booking = require("../models/booking.model");
const { REVENUE_TYPE } = require("../constants/revenue");
const sendResponse = require("../utils/sendResponse");

const NOT_DELETED = { isDeleted: { $ne: true } };

const periodFormats = {
  daily: { format: "%Y-%m-%d", startDays: 30 },
  weekly: { format: "%G-W%V", startDays: 7 * 16 },
  monthly: { format: "%Y-%m", startDays: 365 },
  yearly: { format: "%Y", startDays: 365 * 5 },
};

const buildRevenueGraph = (period) => {
  const config = periodFormats[period];
  const startDate = new Date(Date.now() - config.startDays * 86400000);

  return Revenue.aggregate([
    {
      $match: {
        ...NOT_DELETED,
        date: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          label: {
            $dateToString: {
              format: config.format,
              date: "$date",
              timezone: "Asia/Kolkata",
            },
          },
          source: "$revenueType",
        },
        amount: { $sum: "$amount" },
      },
    },
    {
      $group: {
        _id: "$_id.label",
        sources: {
          $push: { type: "$_id.source", amount: "$amount" },
        },
        total: { $sum: "$amount" },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        label: "$_id",
        total: 1,
        subscriptionRevenue: {
          $let: {
            vars: {
              row: {
                $first: {
                  $filter: {
                    input: "$sources",
                    as: "item",
                    cond: {
                      $eq: ["$$item.type", REVENUE_TYPE.HOST_SUBSCRIPTION],
                    },
                  },
                },
              },
            },
            in: { $ifNull: ["$$row.amount", 0] },
          },
        },
        guestCommissionRevenue: {
          $let: {
            vars: {
              row: {
                $first: {
                  $filter: {
                    input: "$sources",
                    as: "item",
                    cond: {
                      $eq: [
                        "$$item.type",
                        REVENUE_TYPE.GUEST_BOOKING_COMMISSION,
                      ],
                    },
                  },
                },
              },
            },
            in: { $ifNull: ["$$row.amount", 0] },
          },
        },
      },
    },
  ]);
};

const growthPercentage = (current, previous) => {
  const currentValue = Number(current || 0);
  const previousValue = Number(previous || 0);
  if (previousValue === 0) return currentValue === 0 ? 0 : 100;
  return Number((((currentValue - previousValue) / previousValue) * 100).toFixed(1));
};

const getRevenueAnalytics = asyncHandler(async (req, res) => {
  const now = new Date();
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    totals,
    currentMonth,
    previousMonth,
    daily,
    weekly,
    monthly,
    yearly,
    sourceBreakdown,
    topEarningHosts,
    topBookedCities,
    topAreas,
  ] = await Promise.all([
    Revenue.aggregate([
      { $match: NOT_DELETED },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
          subscriptionRevenue: {
            $sum: {
              $cond: [
                { $eq: ["$revenueType", REVENUE_TYPE.HOST_SUBSCRIPTION] },
                "$amount",
                0,
              ],
            },
          },
          guestCommissionRevenue: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$revenueType",
                    REVENUE_TYPE.GUEST_BOOKING_COMMISSION,
                  ],
                },
                "$amount",
                0,
              ],
            },
          },
        },
      },
    ]),
    Revenue.aggregate([
      { $match: { ...NOT_DELETED, date: { $gte: currentStart } } },
      { $group: { _id: null, amount: { $sum: "$amount" } } },
    ]),
    Revenue.aggregate([
      {
        $match: {
          ...NOT_DELETED,
          date: { $gte: previousStart, $lt: currentStart },
        },
      },
      { $group: { _id: null, amount: { $sum: "$amount" } } },
    ]),
    buildRevenueGraph("daily"),
    buildRevenueGraph("weekly"),
    buildRevenueGraph("monthly"),
    buildRevenueGraph("yearly"),
    Revenue.aggregate([
      { $match: NOT_DELETED },
      { $group: { _id: "$revenueType", amount: { $sum: "$amount" } } },
      { $sort: { amount: -1 } },
    ]),
    Booking.aggregate([
      {
        $match: {
          isDeleted: false,
          paymentStatus: "paid",
          hostShare: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: "$host",
          hostEarnings: { $sum: "$hostShare" },
          adminCommission: { $sum: "$adminShare" },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { hostEarnings: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "host",
        },
      },
      { $unwind: { path: "$host", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          hostId: "$_id",
          name: { $ifNull: ["$host.name", "$host.email"] },
          avatar: "$host.avatar",
          hostEarnings: 1,
          adminCommission: 1,
          bookings: 1,
        },
      },
    ]),
    Revenue.aggregate([
      {
        $match: {
          ...NOT_DELETED,
          revenueType: REVENUE_TYPE.GUEST_BOOKING_COMMISSION,
          city: { $ne: "" },
        },
      },
      {
        $group: {
          _id: "$city",
          bookingCount: { $sum: 1 },
          revenue: { $sum: "$grossAmount" },
          adminRevenue: { $sum: "$amount" },
        },
      },
      { $sort: { bookingCount: -1, revenue: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          city: "$_id",
          bookingCount: 1,
          revenue: 1,
          adminRevenue: 1,
        },
      },
    ]),
    Revenue.aggregate([
      {
        $match: {
          ...NOT_DELETED,
          revenueType: REVENUE_TYPE.GUEST_BOOKING_COMMISSION,
          area: { $ne: "" },
        },
      },
      {
        $group: {
          _id: { city: "$city", area: "$area" },
          bookingCount: { $sum: 1 },
          revenue: { $sum: "$grossAmount" },
        },
      },
      { $sort: { bookingCount: -1, revenue: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          city: "$_id.city",
          area: "$_id.area",
          bookingCount: 1,
          revenue: 1,
        },
      },
    ]),
  ]);

  const currentRevenue = Number(currentMonth[0]?.amount || 0);
  const previousRevenue = Number(previousMonth[0]?.amount || 0);
  const summary = totals[0] || {
    totalRevenue: 0,
    subscriptionRevenue: 0,
    guestCommissionRevenue: 0,
  };

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000);
  const locationGrowth = await Revenue.aggregate([
    {
      $match: {
        ...NOT_DELETED,
        revenueType: REVENUE_TYPE.GUEST_BOOKING_COMMISSION,
        city: { $ne: "" },
        date: { $gte: sixtyDaysAgo },
      },
    },
    {
      $group: {
        _id: "$city",
        currentBookings: {
          $sum: { $cond: [{ $gte: ["$date", thirtyDaysAgo] }, 1, 0] },
        },
        previousBookings: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gte: ["$date", sixtyDaysAgo] },
                  { $lt: ["$date", thirtyDaysAgo] },
                ],
              },
              1,
              0,
            ],
          },
        },
        currentRevenue: {
          $sum: {
            $cond: [{ $gte: ["$date", thirtyDaysAgo] }, "$grossAmount", 0],
          },
        },
      },
    },
    { $sort: { currentBookings: -1, currentRevenue: -1 } },
    { $limit: 10 },
  ]);

  return sendResponse(res, 200, true, "Revenue analytics fetched successfully.", {
    overview: {
      ...summary,
      currentMonthRevenue: currentRevenue,
      previousMonthRevenue: previousRevenue,
      growth: growthPercentage(currentRevenue, previousRevenue),
      currency: "INR",
    },
    graphs: { daily, weekly, monthly, yearly },
    revenueComparison: {
      current: currentRevenue,
      previous: previousRevenue,
      growth: growthPercentage(currentRevenue, previousRevenue),
    },
    sourceBreakdown,
    topEarningHosts,
    topBookedCities,
    trendingLocations: {
      cities: locationGrowth.map((item) => ({
        city: item._id,
        bookingCount: item.currentBookings,
        revenue: item.currentRevenue,
        growth: growthPercentage(item.currentBookings, item.previousBookings),
      })),
      areas: topAreas,
    },
    generatedAt: new Date().toISOString(),
  });
});

module.exports = { getRevenueAnalytics };