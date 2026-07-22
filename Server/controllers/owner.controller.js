const asyncHandler = require("express-async-handler");

const Apartment = require("../models/apartment.model");
const Booking = require("../models/booking.model");
const Payment = require("../models/payment.model");
const User = require("../models/user.model");

const APARTMENT_STATUS = require("../constants/apartmentStatus");
const ROLES = require("../constants/roles");
const sendResponse = require("../utils/sendResponse");

const NOT_DELETED = {
  isDeleted: {
    $ne: true,
  },
};

const PAYMENT_SUCCESS_STATUS = "success";
const TREND_MONTHS = 12;

// ======================================
// Date Helpers
// ======================================

const monthStartUTC = (date = new Date()) => {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      1
    )
  );
};

const moveMonthUTC = (date, amount) => {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + amount,
      1
    )
  );
};

// ======================================
// Create Last 12 Month Buckets
// ======================================

const createMonthBuckets = () => {
  const currentMonth = monthStartUTC();
  const buckets = [];

  for (
    let index = TREND_MONTHS - 1;
    index >= 0;
    index -= 1
  ) {
    const date = moveMonthUTC(
      currentMonth,
      -index
    );

    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;

    buckets.push({
      key: `${year}-${String(month).padStart(2, "0")}`,

      label: date.toLocaleString("en-IN", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      }),

      year,
      month,

      users: 0,
      hosts: 0,
      guests: 0,
      listings: 0,
      bookings: 0,
      revenue: 0,
    });
  }

  return buckets;
};

// ======================================
// Monthly Record Count
// ======================================

const monthlyCount = (
  Model,
  match,
  startDate
) => {
  return Model.aggregate([
    {
      $match: {
        ...match,

        createdAt: {
          $gte: startDate,
        },
      },
    },

    {
      $group: {
        _id: {
          year: {
            $year: "$createdAt",
          },

          month: {
            $month: "$createdAt",
          },
        },

        value: {
          $sum: 1,
        },
      },
    },
  ]);
};

// ======================================
// Monthly Revenue
// ======================================

const monthlyRevenue = (startDate) => {
  return Payment.aggregate([
    {
      $match: {
        ...NOT_DELETED,
        status: PAYMENT_SUCCESS_STATUS,
      },
    },

    {
      $addFields: {
        effectiveDate: {
          $ifNull: [
            "$paidAt",
            "$createdAt",
          ],
        },
      },
    },

    {
      $match: {
        effectiveDate: {
          $gte: startDate,
        },
      },
    },

    {
      $group: {
        _id: {
          year: {
            $year: "$effectiveDate",
          },

          month: {
            $month: "$effectiveDate",
          },
        },

        value: {
          $sum: "$amount",
        },
      },
    },
  ]);
};

// ======================================
// Status Count Helper
// ======================================

const statusCounts = async (Model) => {
  const rows = await Model.aggregate([
    {
      $match: NOT_DELETED,
    },

    {
      $group: {
        _id: "$status",

        value: {
          $sum: 1,
        },
      },
    },
  ]);

  return rows.reduce(
    (result, row) => {
      if (row._id) {
        result[row._id] = row.value;
      }

      return result;
    },
    {}
  );
};

// ======================================
// Merge Monthly Result
// ======================================

const mergeMetric = (
  bucketMap,
  rows,
  field
) => {
  rows.forEach((row) => {
    const key = `${row._id.year}-${String(
      row._id.month
    ).padStart(2, "0")}`;

    if (bucketMap.has(key)) {
      bucketMap.get(key)[field] =
        Number(row.value || 0);
    }
  });
};

// ======================================
// Growth Percentage Helper
// ======================================

const growthMetric = (
  currentValue,
  previousValue
) => {
  const current =
    Number(currentValue || 0);

  const previous =
    Number(previousValue || 0);

  let percentage = 0;

  if (previous === 0) {
    percentage =
      current === 0
        ? 0
        : 100;
  } else {
    percentage =
      ((current - previous) /
        previous) *
      100;
  }

  return {
    current,
    previous,

    percentage: Number(
      percentage.toFixed(1)
    ),
  };
};

// ======================================
// Super Admin Dashboard
// GET /api/owner/dashboard
// ======================================

const getDashboard = asyncHandler(
  async (req, res) => {
    const buckets =
      createMonthBuckets();

    const firstBucket =
      buckets[0];

    const trendStart =
      new Date(
        Date.UTC(
          firstBucket.year,
          firstBucket.month - 1,
          1
        )
      );

    // Host can be identified by role
    // or by the isHost flag.
    const hostFilter = {
      ...NOT_DELETED,

      $or: [
        {
          role: ROLES.HOST,
        },

        {
          isHost: true,
        },
      ],
    };

    const guestFilter = {
      ...NOT_DELETED,
      role: ROLES.GUEST,
    };

    const adminRoles = [
      ROLES.OWNER,
      ROLES.SUPER_ADMIN,
    ].filter(Boolean);

    const [
      totalUsers,
      totalHosts,
      totalGuests,
      totalAdmins,
      totalListings,
      totalBookings,
      revenueResult,
      listingStatuses,
      bookingStatuses,
      userTrend,
      hostTrend,
      guestTrend,
      listingTrend,
      bookingTrend,
      revenueTrend,
    ] = await Promise.all([
      // Total Users
      User.countDocuments(
        NOT_DELETED
      ),

      // Total Hosts
      User.countDocuments(
        hostFilter
      ),

      // Total Guests
      User.countDocuments(
        guestFilter
      ),

      // Total Super Admins / Owners
      User.countDocuments({
        ...NOT_DELETED,

        role: {
          $in: adminRoles,
        },
      }),

      // Total Listings
      Apartment.countDocuments(
        NOT_DELETED
      ),

      // Total Bookings
      Booking.countDocuments(
        NOT_DELETED
      ),

      // Total Successful Payment Revenue
      Payment.aggregate([
        {
          $match: {
            ...NOT_DELETED,
            status:
              PAYMENT_SUCCESS_STATUS,
          },
        },

        {
          $group: {
            _id: null,

            total: {
              $sum: "$amount",
            },
          },
        },
      ]),

      // Listing Status Breakdown
      statusCounts(Apartment),

      // Booking Status Breakdown
      statusCounts(Booking),

      // Monthly Users
      monthlyCount(
        User,
        NOT_DELETED,
        trendStart
      ),

      // Monthly Hosts
      monthlyCount(
        User,
        hostFilter,
        trendStart
      ),

      // Monthly Guests
      monthlyCount(
        User,
        guestFilter,
        trendStart
      ),

      // Monthly Listings
      monthlyCount(
        Apartment,
        NOT_DELETED,
        trendStart
      ),

      // Monthly Bookings
      monthlyCount(
        Booking,
        NOT_DELETED,
        trendStart
      ),

      // Monthly Revenue
      monthlyRevenue(
        trendStart
      ),
    ]);

    // ======================================
    // Merge Monthly Analytics
    // ======================================

    const bucketMap =
      new Map(
        buckets.map((bucket) => [
          bucket.key,
          bucket,
        ])
      );

    mergeMetric(
      bucketMap,
      userTrend,
      "users"
    );

    mergeMetric(
      bucketMap,
      hostTrend,
      "hosts"
    );

    mergeMetric(
      bucketMap,
      guestTrend,
      "guests"
    );

    mergeMetric(
      bucketMap,
      listingTrend,
      "listings"
    );

    mergeMetric(
      bucketMap,
      bookingTrend,
      "bookings"
    );

    mergeMetric(
      bucketMap,
      revenueTrend,
      "revenue"
    );

    const monthlyTrend =
      Array.from(
        bucketMap.values()
      );

    const currentMonth =
      monthlyTrend.at(-1) || {};

    const previousMonth =
      monthlyTrend.at(-2) || {};

    // ======================================
    // Dashboard Response
    // ======================================

    return sendResponse(
      res,
      200,
      true,
      "Super Admin dashboard fetched successfully.",
      {
        overview: {
          totalUsers,
          totalHosts,
          totalGuests,
          totalListings,
          totalBookings,

          totalRevenue: Number(
            revenueResult[0]?.total || 0
          ),

          currency: "INR",
        },

        growth: {
          users: growthMetric(
            currentMonth.users,
            previousMonth.users
          ),

          hosts: growthMetric(
            currentMonth.hosts,
            previousMonth.hosts
          ),

          guests: growthMetric(
            currentMonth.guests,
            previousMonth.guests
          ),

          listings: growthMetric(
            currentMonth.listings,
            previousMonth.listings
          ),

          bookings: growthMetric(
            currentMonth.bookings,
            previousMonth.bookings
          ),

          revenue: growthMetric(
            currentMonth.revenue,
            previousMonth.revenue
          ),
        },

        analytics: {
          monthlyTrend,

          userDistribution: {
            guests: totalGuests,
            hosts: totalHosts,
            administrators:
              totalAdmins,
          },

          listingStatus: {
            draft:
              listingStatuses[
                APARTMENT_STATUS.DRAFT
              ] || 0,

            pending:
              listingStatuses[
                APARTMENT_STATUS.PENDING
              ] || 0,

            approved:
              listingStatuses[
                APARTMENT_STATUS.APPROVED
              ] || 0,

            rejected:
              listingStatuses[
                APARTMENT_STATUS.REJECTED
              ] || 0,

            inactive:
              listingStatuses[
                APARTMENT_STATUS.INACTIVE
              ] || 0,
          },

          bookingStatus: {
            pending:
              bookingStatuses.pending || 0,

            confirmed:
              bookingStatuses.confirmed || 0,

            completed:
              bookingStatuses.completed || 0,

            cancelled:
              bookingStatuses.cancelled || 0,
          },
        },

        generatedAt:
          new Date().toISOString(),
      }
    );
  }
);

// ======================================
// Get All Pending Apartments
// Existing functionality preserved
// ======================================

const getPendingApartments =
  asyncHandler(
    async (req, res) => {
      const apartments =
        await Apartment.find({
          status:
            APARTMENT_STATUS.PENDING,

          isDeleted: false,
        })
          .populate(
            "host",
            "name email avatar"
          )
          .sort({
            createdAt: -1,
          });

      return sendResponse(
        res,
        200,
        true,
        "Pending apartments fetched successfully.",
        apartments
      );
    }
  );

// ======================================
// Get Single Apartment For Owner
// ======================================

const getApartmentByIdForOwner =
  asyncHandler(
    async (req, res) => {
      const apartment =
        await Apartment.findOne({
          _id: req.params.id,
          isDeleted: false,
        }).populate(
          "host",
          "name email avatar phone"
        );

      if (!apartment) {
        return sendResponse(
          res,
          404,
          false,
          "Apartment not found."
        );
      }

      return sendResponse(
        res,
        200,
        true,
        "Apartment fetched successfully.",
        apartment
      );
    }
  );

// ======================================
// Approve Apartment
// Existing functionality preserved
// ======================================

const approveApartment =
  asyncHandler(
    async (req, res) => {
      const apartment =
        await Apartment.findOne({
          _id: req.params.id,
          isDeleted: false,
        });

      if (!apartment) {
        return sendResponse(
          res,
          404,
          false,
          "Apartment not found."
        );
      }

      if (
        apartment.status ===
        APARTMENT_STATUS.APPROVED
      ) {
        return sendResponse(
          res,
          400,
          false,
          "Apartment is already approved."
        );
      }

      apartment.status =
        APARTMENT_STATUS.APPROVED;

      await apartment.save();

      return sendResponse(
        res,
        200,
        true,
        "Apartment approved successfully.",
        apartment
      );
    }
  );

// ======================================
// Reject Apartment
// Existing functionality preserved
// ======================================

const rejectApartment =
  asyncHandler(
    async (req, res) => {
      const apartment =
        await Apartment.findOne({
          _id: req.params.id,
          isDeleted: false,
        });

      if (!apartment) {
        return sendResponse(
          res,
          404,
          false,
          "Apartment not found."
        );
      }

      if (
        apartment.status ===
        APARTMENT_STATUS.REJECTED
      ) {
        return sendResponse(
          res,
          400,
          false,
          "Apartment is already rejected."
        );
      }

      apartment.status =
        APARTMENT_STATUS.REJECTED;

      await apartment.save();

      return sendResponse(
        res,
        200,
        true,
        "Apartment rejected successfully.",
        apartment
      );
    }
  );

// ======================================
// Exports
// ======================================

module.exports = {
  getDashboard,
  getPendingApartments,
  getApartmentByIdForOwner,
  approveApartment,
  rejectApartment,
};