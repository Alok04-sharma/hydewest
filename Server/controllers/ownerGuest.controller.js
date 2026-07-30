const asyncHandler = require("express-async-handler");

const User = require("../models/user.model");
const ROLES = require("../constants/roles");
const USER_STATUS = require("../constants/userStatus");
const sendResponse = require("../utils/sendResponse");

const SUSPENDED_STATUSES = [
  USER_STATUS.SUSPENDED,
  USER_STATUS.BLOCKED,
].filter(Boolean);

// ======================================
// Search text helper
// ======================================

const escapeRegex = (value = "") => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// ======================================
// Guest query builder
// ======================================

const buildGuestMatch = ({ search = "", status = "all" } = {}) => {
  const conditions = [
    {
      role: ROLES.GUEST,
    },
    {
      isDeleted: {
        $ne: true,
      },
    },
  ];

  if (status === "active") {
    conditions.push({
      status: USER_STATUS.ACTIVE,
    });
  } else if (status === "suspended") {
    conditions.push({
      status: {
        $in: SUSPENDED_STATUSES,
      },
    });
  } else if (status === "unverified") {
    conditions.push({
      isVerified: {
        $ne: true,
      },
    });
  }

  const normalizedSearch = String(search || "").trim();

  if (normalizedSearch) {
    const searchRegex = new RegExp(escapeRegex(normalizedSearch), "i");

    conditions.push({
      $or: [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ],
    });
  }

  return {
    $and: conditions,
  };
};

// ======================================
// View all Guests
// GET /api/owner/guests
// ======================================

const getGuests = asyncHandler(async (req, res) => {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);

  const limit = Math.min(
    Math.max(Number.parseInt(req.query.limit, 10) || 10, 1),
    50
  );

  const search = String(req.query.search || "").trim();

  const status = ["all", "active", "suspended", "unverified"].includes(
    req.query.status
  )
    ? req.query.status
    : "all";

  const sortBy = [
    "newest",
    "oldest",
    "name",
    "bookings",
    "spend",
  ].includes(req.query.sortBy)
    ? req.query.sortBy
    : "newest";

  const match = buildGuestMatch({ search, status });

  const sortMap = {
    newest: { createdAt: -1, _id: -1 },
    oldest: { createdAt: 1, _id: 1 },
    name: { name: 1, email: 1 },
    bookings: { "bookingStats.totalBookings": -1, createdAt: -1 },
    spend: { "bookingStats.totalSpent": -1, createdAt: -1 },
  };

  const baseGuestMatch = {
    role: ROLES.GUEST,
    isDeleted: { $ne: true },
  };

  const [rows, total, summaryRows] = await Promise.all([
    User.aggregate([
      {
        $match: match,
      },
      {
        $lookup: {
          from: "bookings",
          let: {
            guestId: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$guest", "$$guestId"],
                },
                isDeleted: {
                  $ne: true,
                },
              },
            },
            {
              $group: {
                _id: null,
                totalBookings: { $sum: 1 },
                paidBookings: {
                  $sum: {
                    $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0],
                  },
                },
                completedBookings: {
                  $sum: {
                    $cond: [{ $eq: ["$status", "completed"] }, 1, 0],
                  },
                },
                totalSpent: {
                  $sum: {
                    $cond: [
                      { $eq: ["$paymentStatus", "paid"] },
                      { $ifNull: ["$totalAmount", 0] },
                      0,
                    ],
                  },
                },
                lastBookingAt: {
                  $max: "$createdAt",
                },
              },
            },
            {
              $project: {
                _id: 0,
                totalBookings: 1,
                paidBookings: 1,
                completedBookings: 1,
                totalSpent: 1,
                lastBookingAt: 1,
              },
            },
          ],
          as: "bookingStatsRows",
        },
      },
      {
        $addFields: {
          bookingStats: {
            $ifNull: [
              { $first: "$bookingStatsRows" },
              {
                totalBookings: 0,
                paidBookings: 0,
                completedBookings: 0,
                totalSpent: 0,
                lastBookingAt: null,
              },
            ],
          },
        },
      },
      {
        $sort: sortMap[sortBy],
      },
      {
        $skip: (page - 1) * limit,
      },
      {
        $limit: limit,
      },
      {
        $project: {
          password: 0,
          bookingStatsRows: 0,
          moderation: 0,
          __v: 0,
        },
      },
    ]),
    User.countDocuments(match),
    User.aggregate([
      {
        $match: baseGuestMatch,
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: {
              $cond: [{ $eq: ["$status", USER_STATUS.ACTIVE] }, 1, 0],
            },
          },
          suspended: {
            $sum: {
              $cond: [{ $in: ["$status", SUSPENDED_STATUSES] }, 1, 0],
            },
          },
          verified: {
            $sum: {
              $cond: [{ $eq: ["$isVerified", true] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          total: 1,
          active: 1,
          suspended: 1,
          verified: 1,
          unverified: {
            $subtract: ["$total", "$verified"],
          },
        },
      },
    ]),
  ]);

  const totalPages = Math.max(Math.ceil(total / limit), 1);

  return sendResponse(res, 200, true, "Guests fetched successfully.", {
    guests: rows,
    summary: summaryRows[0] || {
      total: 0,
      active: 0,
      suspended: 0,
      verified: 0,
      unverified: 0,
    },
    filters: {
      search,
      status,
      sortBy,
    },
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  });
});

module.exports = {
  getGuests,
};
