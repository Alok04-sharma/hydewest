const asyncHandler = require("express-async-handler");

const Revenue = require("../models/revenue.model");
const Booking = require("../models/booking.model");
const { REVENUE_TYPE } = require("../constants/revenue");
const sendResponse = require("../utils/sendResponse");

const NOT_DELETED = {
  isDeleted: {
    $ne: true,
  },
};

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// ======================================
// Calendar helpers for Asia/Kolkata
// ======================================

const getIstDateParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
  };
};

const toCalendarDate = ({ year, month, day }) => {
  return new Date(Date.UTC(year, month - 1, day));
};

const fromCalendarDate = (date) => ({
  year: date.getUTCFullYear(),
  month: date.getUTCMonth() + 1,
  day: date.getUTCDate(),
});

const moveCalendarDays = (parts, amount) => {
  const date = toCalendarDate(parts);
  date.setUTCDate(date.getUTCDate() + amount);
  return fromCalendarDate(date);
};

const istMidnightToUtc = ({ year, month, day }) => {
  return new Date(Date.UTC(year, month - 1, day) - IST_OFFSET_MS);
};

const dateKey = ({ year, month, day }) => {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0"
  )}`;
};

const monthKey = ({ year, month }) => {
  return `${year}-${String(month).padStart(2, "0")}`;
};

const formatCalendarDate = (parts, options) => {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    ...options,
  }).format(toCalendarDate(parts));
};

const getIsoWeekData = (parts) => {
  const date = toCalendarDate(parts);
  const day = date.getUTCDay() || 7;

  date.setUTCDate(date.getUTCDate() + 4 - day);

  const isoYear = date.getUTCFullYear();
  const firstDay = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(((date - firstDay) / DAY_MS + 1) / 7);

  return {
    isoYear,
    week,
    key: `${isoYear}-W${String(week).padStart(2, "0")}`,
  };
};

const getWeekMonday = (parts) => {
  const date = toCalendarDate(parts);
  const day = date.getUTCDay() || 7;

  date.setUTCDate(date.getUTCDate() - day + 1);

  return fromCalendarDate(date);
};

// ======================================
// Complete revenue graph buckets
// ======================================

const emptyRevenueRow = (bucket) => ({
  key: bucket.key,
  label: bucket.label,
  fullLabel: bucket.fullLabel || bucket.label,
  subscriptionRevenue: 0,
  guestCommissionRevenue: 0,
  total: 0,
});

const addRevenueToRow = (row, source, amount) => {
  const safeAmount = Number(amount || 0);

  if (source === REVENUE_TYPE.HOST_SUBSCRIPTION) {
    row.subscriptionRevenue += safeAmount;
  }

  if (source === REVENUE_TYPE.GUEST_BOOKING_COMMISSION) {
    row.guestCommissionRevenue += safeAmount;
  }

  row.total = row.subscriptionRevenue + row.guestCommissionRevenue;
};

const createDailyBuckets = (todayParts) => {
  return Array.from({ length: 30 }, (_, index) => {
    const parts = moveCalendarDays(todayParts, index - 29);

    return {
      key: dateKey(parts),
      label: formatCalendarDate(parts, {
        day: "2-digit",
        month: "short",
      }),
      fullLabel: formatCalendarDate(parts, {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };
  });
};

const createWeeklyBuckets = (todayParts) => {
  const currentMonday = getWeekMonday(todayParts);

  return Array.from({ length: 16 }, (_, index) => {
    const start = moveCalendarDays(currentMonday, (index - 15) * 7);
    const end = moveCalendarDays(start, 6);
    const iso = getIsoWeekData(start);

    return {
      key: iso.key,
      label: `${formatCalendarDate(start, {
        day: "2-digit",
        month: "short",
      })}–${formatCalendarDate(end, {
        day: "2-digit",
        month: "short",
      })}`,
      fullLabel: `Week ${iso.week}, ${iso.isoYear}`,
    };
  });
};

const createMonthlyBuckets = (todayParts) => {
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(
      Date.UTC(todayParts.year, todayParts.month - 1 + index - 11, 1)
    );

    const parts = {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: 1,
    };

    return {
      key: monthKey(parts),
      label: formatCalendarDate(parts, {
        month: "short",
        year: "2-digit",
      }),
      fullLabel: formatCalendarDate(parts, {
        month: "long",
        year: "numeric",
      }),
    };
  });
};

const createYearlyBuckets = (todayParts) => {
  return Array.from({ length: 5 }, (_, index) => {
    const year = todayParts.year + index - 4;

    return {
      key: String(year),
      label: String(year),
      fullLabel: String(year),
    };
  });
};

const buildRevenueGraphs = async () => {
  const todayParts = getIstDateParts();
  const earliestYear = todayParts.year - 4;
  const startDate = istMidnightToUtc({
    year: earliestYear,
    month: 1,
    day: 1,
  });

  const dailySourceRows = await Revenue.aggregate([
    {
      $match: {
        ...NOT_DELETED,
        date: {
          $gte: startDate,
        },
      },
    },
    {
      $group: {
        _id: {
          day: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$date",
              timezone: "Asia/Kolkata",
            },
          },
          source: "$revenueType",
        },
        amount: {
          $sum: "$amount",
        },
      },
    },
    {
      $project: {
        _id: 0,
        day: "$_id.day",
        source: "$_id.source",
        amount: 1,
      },
    },
    {
      $sort: {
        day: 1,
      },
    },
  ]);

  const bucketSets = {
    daily: createDailyBuckets(todayParts),
    weekly: createWeeklyBuckets(todayParts),
    monthly: createMonthlyBuckets(todayParts),
    yearly: createYearlyBuckets(todayParts),
  };

  const graphMaps = Object.fromEntries(
    Object.entries(bucketSets).map(([period, buckets]) => [
      period,
      new Map(buckets.map((bucket) => [bucket.key, emptyRevenueRow(bucket)])),
    ])
  );

  dailySourceRows.forEach((sourceRow) => {
    const [year, month, day] = String(sourceRow.day)
      .split("-")
      .map(Number);

    const parts = { year, month, day };
    const keys = {
      daily: dateKey(parts),
      weekly: getIsoWeekData(parts).key,
      monthly: monthKey(parts),
      yearly: String(year),
    };

    Object.entries(keys).forEach(([period, key]) => {
      const row = graphMaps[period].get(key);

      if (row) {
        addRevenueToRow(row, sourceRow.source, sourceRow.amount);
      }
    });
  });

  return Object.fromEntries(
    Object.entries(bucketSets).map(([period, buckets]) => [
      period,
      buckets.map((bucket) => graphMaps[period].get(bucket.key)),
    ])
  );
};

// ======================================
// Revenue growth helper
// ======================================

const growthPercentage = (current, previous) => {
  const currentValue = Number(current || 0);
  const previousValue = Number(previous || 0);

  if (previousValue === 0) {
    return currentValue === 0 ? 0 : 100;
  }

  return Number(
    (((currentValue - previousValue) / previousValue) * 100).toFixed(1)
  );
};

// ======================================
// Super Admin revenue analytics
// ======================================

const getRevenueAnalytics = asyncHandler(async (_req, res) => {
  const nowParts = getIstDateParts();

  const currentStart = istMidnightToUtc({
    year: nowParts.year,
    month: nowParts.month,
    day: 1,
  });

  const previousMonthDate = new Date(
    Date.UTC(nowParts.year, nowParts.month - 2, 1)
  );

  const previousStart = istMidnightToUtc({
    year: previousMonthDate.getUTCFullYear(),
    month: previousMonthDate.getUTCMonth() + 1,
    day: 1,
  });

  const [
    totals,
    currentMonth,
    previousMonth,
    graphs,
    sourceBreakdown,
    topEarningHosts,
    topBookedCities,
    topAreas,
  ] = await Promise.all([
    Revenue.aggregate([
      {
        $match: NOT_DELETED,
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: "$amount",
          },
          subscriptionRevenue: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$revenueType",
                    REVENUE_TYPE.HOST_SUBSCRIPTION,
                  ],
                },
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
      {
        $match: {
          ...NOT_DELETED,
          date: {
            $gte: currentStart,
          },
        },
      },
      {
        $group: {
          _id: null,
          amount: {
            $sum: "$amount",
          },
        },
      },
    ]),
    Revenue.aggregate([
      {
        $match: {
          ...NOT_DELETED,
          date: {
            $gte: previousStart,
            $lt: currentStart,
          },
        },
      },
      {
        $group: {
          _id: null,
          amount: {
            $sum: "$amount",
          },
        },
      },
    ]),
    buildRevenueGraphs(),
    Revenue.aggregate([
      {
        $match: NOT_DELETED,
      },
      {
        $group: {
          _id: "$revenueType",
          amount: {
            $sum: "$amount",
          },
        },
      },
      {
        $sort: {
          amount: -1,
        },
      },
    ]),
    Booking.aggregate([
      {
        $match: {
          isDeleted: false,
          paymentStatus: "paid",
          hostShare: {
            $gt: 0,
          },
        },
      },
      {
        $group: {
          _id: "$host",
          hostEarnings: {
            $sum: "$hostShare",
          },
          adminCommission: {
            $sum: "$adminShare",
          },
          bookings: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          hostEarnings: -1,
        },
      },
      {
        $limit: 10,
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "host",
        },
      },
      {
        $unwind: {
          path: "$host",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          hostId: "$_id",
          name: {
            $ifNull: ["$host.name", "$host.email"],
          },
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
          city: {
            $nin: ["", null],
          },
        },
      },
      {
        $group: {
          _id: "$city",
          bookingCount: {
            $sum: 1,
          },
          revenue: {
            $sum: "$grossAmount",
          },
          adminRevenue: {
            $sum: "$amount",
          },
        },
      },
      {
        $sort: {
          bookingCount: -1,
          revenue: -1,
        },
      },
      {
        $limit: 10,
      },
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
          area: {
            $nin: ["", null],
          },
        },
      },
      {
        $group: {
          _id: {
            city: "$city",
            area: "$area",
          },
          bookingCount: {
            $sum: 1,
          },
          revenue: {
            $sum: "$grossAmount",
          },
        },
      },
      {
        $sort: {
          bookingCount: -1,
          revenue: -1,
        },
      },
      {
        $limit: 10,
      },
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

  const thirtyDaysAgo = new Date(Date.now() - 30 * DAY_MS);
  const sixtyDaysAgo = new Date(Date.now() - 60 * DAY_MS);

  const locationGrowth = await Revenue.aggregate([
    {
      $match: {
        ...NOT_DELETED,
        revenueType: REVENUE_TYPE.GUEST_BOOKING_COMMISSION,
        city: {
          $nin: ["", null],
        },
        date: {
          $gte: sixtyDaysAgo,
        },
      },
    },
    {
      $group: {
        _id: "$city",
        currentBookings: {
          $sum: {
            $cond: [{ $gte: ["$date", thirtyDaysAgo] }, 1, 0],
          },
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
            $cond: [
              { $gte: ["$date", thirtyDaysAgo] },
              "$grossAmount",
              0,
            ],
          },
        },
      },
    },
    {
      $sort: {
        currentBookings: -1,
        currentRevenue: -1,
      },
    },
    {
      $limit: 10,
    },
  ]);

  return sendResponse(
    res,
    200,
    true,
    "Revenue analytics fetched successfully.",
    {
      overview: {
        ...summary,
        currentMonthRevenue: currentRevenue,
        previousMonthRevenue: previousRevenue,
        growth: growthPercentage(currentRevenue, previousRevenue),
        currency: "INR",
      },
      graphs,
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
          growth: growthPercentage(
            item.currentBookings,
            item.previousBookings
          ),
        })),
        areas: topAreas,
      },
      generatedAt: new Date().toISOString(),
    }
  );
});

module.exports = {
  getRevenueAnalytics,
};
