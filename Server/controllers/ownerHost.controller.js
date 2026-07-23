const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");

const User = require("../models/user.model");
const Apartment = require("../models/apartment.model");
const Booking = require("../models/booking.model");
const Payment = require("../models/payment.model");

const ROLES = require("../constants/roles");
const USER_STATUS = require("../constants/userStatus");
const APARTMENT_STATUS = require(
  "../constants/apartmentStatus"
);

const sendResponse = require("../utils/sendResponse");

const ADMIN_ROLES = [
  ROLES.OWNER,
  ROLES.SUPER_ADMIN,
  "admin",
].filter(Boolean);

const SUSPENDED_STATUSES = [
  USER_STATUS.SUSPENDED,
  USER_STATUS.BLOCKED,
].filter(Boolean);

// ======================================
// Helper: Escape Search String
// ======================================

const escapeRegex = (value = "") => {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

// ======================================
// Host Identity Filter
// ======================================

const hostIdentityCondition = {
  $and: [
    {
      $or: [
        {
          role: ROLES.HOST,
        },
        {
          isHost: true,
        },
      ],
    },
    {
      role: {
        $nin: ADMIN_ROLES,
      },
    },
  ],
};

// ======================================
// Host Search / Status Filter
// ======================================

const buildHostMatch = ({
  search = "",
  status = "all",
} = {}) => {
  const conditions = [
    ...hostIdentityCondition.$and,
  ];

  if (status === "active") {
    conditions.push({
      isDeleted: {
        $ne: true,
      },
      status: USER_STATUS.ACTIVE,
    });
  } else if (
    status === "suspended"
  ) {
    conditions.push({
      isDeleted: {
        $ne: true,
      },
      status: {
        $in: SUSPENDED_STATUSES,
      },
    });
  } else if (
    status === "removed"
  ) {
    conditions.push({
      $or: [
        {
          isDeleted: true,
        },
        {
          status:
            USER_STATUS.REMOVED,
        },
      ],
    });
  }

  const trimmedSearch = String(
    search || ""
  ).trim();

  if (trimmedSearch) {
    const searchRegex =
      new RegExp(
        escapeRegex(
          trimmedSearch
        ),
        "i"
      );

    conditions.push({
      $or: [
        {
          name: searchRegex,
        },
        {
          email: searchRegex,
        },
        {
          phone: searchRegex,
        },
      ],
    });
  }

  return {
    $and: conditions,
  };
};

// ======================================
// Account Status Helper
// ======================================

const getAccountStatus = (
  host
) => {
  if (
    host.isDeleted ||
    host.status ===
      USER_STATUS.REMOVED
  ) {
    return "removed";
  }

  if (
    SUSPENDED_STATUSES.includes(
      host.status
    )
  ) {
    return "suspended";
  }

  return "active";
};

// ======================================
// Reason Validation
// ======================================

const validateReason = (
  reason,
  actionLabel
) => {
  const normalizedReason =
    String(reason || "").trim();

  if (
    normalizedReason.length < 10
  ) {
    return {
      valid: false,
      message: `${actionLabel} reason kam se kam 10 characters ka hona chahiye.`,
    };
  }

  if (
    normalizedReason.length > 500
  ) {
    return {
      valid: false,
      message: `${actionLabel} reason maximum 500 characters ka ho sakta hai.`,
    };
  }

  return {
    valid: true,
    reason: normalizedReason,
  };
};

// ======================================
// Find Host Helper
// ======================================

const getHostOrFail = async (
  hostId
) => {
  if (
    !mongoose.isValidObjectId(
      hostId
    )
  ) {
    return null;
  }

  return User.findOne({
    _id: hostId,
    ...hostIdentityCondition,
  });
};

// ======================================
// View / Search All Hosts
// GET /api/owner/hosts
// ======================================

const getHosts = asyncHandler(
  async (req, res) => {
    const page = Math.max(
      Number.parseInt(
        req.query.page,
        10
      ) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number.parseInt(
          req.query.limit,
          10
        ) || 10,
        1
      ),
      50
    );

    const search = String(
      req.query.search || ""
    ).trim();

    const status = [
      "all",
      "active",
      "suspended",
      "removed",
    ].includes(
      req.query.status
    )
      ? req.query.status
      : "all";

    const sortBy = String(
      req.query.sortBy ||
        "newest"
    );

    const match =
      buildHostMatch({
        search,
        status,
      });

    const sortMap = {
      newest: {
        createdAt: -1,
      },

      oldest: {
        createdAt: 1,
      },

      name_asc: {
        name: 1,
      },

      name_desc: {
        name: -1,
      },

      most_listings: {
        totalListings: -1,
        createdAt: -1,
      },

      most_bookings: {
        totalBookings: -1,
        createdAt: -1,
      },
    };

    const sort =
      sortMap[sortBy] ||
      sortMap.newest;

    const skip =
      (page - 1) * limit;

    const [
      hosts,
      total,
      active,
      suspended,
      removed,
    ] = await Promise.all([
      User.aggregate([
        {
          $match: match,
        },

        {
          $lookup: {
            from: "apartments",

            let: {
              hostId: "$_id",
            },

            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: [
                      "$host",
                      "$$hostId",
                    ],
                  },

                  isDeleted: {
                    $ne: true,
                  },
                },
              },

              {
                $count: "value",
              },
            ],

            as: "listingStats",
          },
        },

        {
          $lookup: {
            from: "bookings",

            let: {
              hostId: "$_id",
            },

            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: [
                      "$host",
                      "$$hostId",
                    ],
                  },

                  isDeleted: {
                    $ne: true,
                  },
                },
              },

              {
                $count: "value",
              },
            ],

            as: "bookingStats",
          },
        },

        {
          $addFields: {
            totalListings: {
              $ifNull: [
                {
                  $arrayElemAt: [
                    "$listingStats.value",
                    0,
                  ],
                },
                0,
              ],
            },

            totalBookings: {
              $ifNull: [
                {
                  $arrayElemAt: [
                    "$bookingStats.value",
                    0,
                  ],
                },
                0,
              ],
            },

            accountStatus: {
              $cond: [
                {
                  $or: [
                    {
                      $eq: [
                        "$isDeleted",
                        true,
                      ],
                    },

                    {
                      $eq: [
                        "$status",
                        USER_STATUS.REMOVED,
                      ],
                    },
                  ],
                },

                "removed",

                {
                  $cond: [
                    {
                      $in: [
                        "$status",
                        SUSPENDED_STATUSES,
                      ],
                    },

                    "suspended",

                    "active",
                  ],
                },
              ],
            },
          },
        },

        {
          $project: {
            name: 1,
            email: 1,
            phone: 1,
            avatar: 1,
            role: 1,
            isHost: 1,
            isVerified: 1,
            status: 1,
            accountStatus: 1,
            moderation: 1,
            lastLoginAt: 1,
            createdAt: 1,
            updatedAt: 1,
            totalListings: 1,
            totalBookings: 1,
          },
        },

        {
          $sort: sort,
        },

        {
          $skip: skip,
        },

        {
          $limit: limit,
        },
      ]),

      User.countDocuments(
        match
      ),

      User.countDocuments(
        buildHostMatch({
          status: "active",
        })
      ),

      User.countDocuments(
        buildHostMatch({
          status:
            "suspended",
        })
      ),

      User.countDocuments(
        buildHostMatch({
          status: "removed",
        })
      ),
    ]);

    return sendResponse(
      res,
      200,
      true,
      "Hosts fetched successfully.",
      {
        hosts,

        summary: {
          total:
            active +
            suspended +
            removed,

          active,
          suspended,
          removed,
        },

        pagination: {
          page,
          limit,
          total,

          totalPages: Math.max(
            Math.ceil(
              total / limit
            ),
            1
          ),

          hasNextPage:
            page * limit < total,

          hasPreviousPage:
            page > 1,
        },

        filters: {
          search,
          status,
          sortBy,
        },
      }
    );
  }
);

// ======================================
// View Host Profile / Activities
// GET /api/owner/hosts/:hostId
// ======================================

const getHostProfile =
  asyncHandler(
    async (req, res) => {
      const host =
        await getHostOrFail(
          req.params.hostId
        );

      if (!host) {
        return sendResponse(
          res,
          404,
          false,
          "Host account nahi mila."
        );
      }

      await host.populate([
        {
          path:
            "moderation.suspendedBy",

          select:
            "name email role",
        },

        {
          path:
            "moderation.removedBy",

          select:
            "name email role",
        },
      ]);

      const hostObjectId =
        new mongoose.Types.ObjectId(
          host._id
        );

      const [
        listingRows,
        bookingRows,
        revenueRows,
        recentListings,
        recentBookings,
      ] = await Promise.all([
        Apartment.aggregate([
          {
            $match: {
              host: hostObjectId,

              isDeleted: {
                $ne: true,
              },
            },
          },

          {
            $group: {
              _id: "$status",

              count: {
                $sum: 1,
              },

              totalViews: {
                $sum: {
                  $ifNull: [
                    "$views",
                    0,
                  ],
                },
              },
            },
          },
        ]),

        Booking.aggregate([
          {
            $match: {
              host: hostObjectId,

              isDeleted: {
                $ne: true,
              },
            },
          },

          {
            $group: {
              _id: "$status",

              count: {
                $sum: 1,
              },

              bookingValue: {
                $sum: {
                  $ifNull: [
                    "$pricing.totalAmount",
                    0,
                  ],
                },
              },
            },
          },
        ]),

        Payment.aggregate([
          {
            $match: {
              status: "success",

              isDeleted: {
                $ne: true,
              },
            },
          },

          {
            $lookup: {
              from: "bookings",
              localField: "booking",
              foreignField: "_id",
              as: "bookingData",
            },
          },

          {
            $unwind:
              "$bookingData",
          },

          {
            $match: {
              "bookingData.host":
                hostObjectId,
            },
          },

          {
            $group: {
              _id: null,

              totalRevenue: {
                $sum: "$amount",
              },

              successfulPayments: {
                $sum: 1,
              },
            },
          },
        ]),

        Apartment.find({
          host: host._id,

          isDeleted: {
            $ne: true,
          },
        })
          .select(
            "title slug propertyType status location pricing images views bookingCount createdAt updatedAt"
          )
          .sort({
            createdAt: -1,
          })
          .limit(8)
          .lean(),

        Booking.find({
          host: host._id,

          isDeleted: {
            $ne: true,
          },
        })
          .populate(
            "guest",
            "name email avatar"
          )
          .populate(
            "apartment",
            "title images location"
          )
          .select(
            "guest apartment status paymentStatus checkIn checkOut guestsCount pricing createdAt updatedAt"
          )
          .sort({
            createdAt: -1,
          })
          .limit(8)
          .lean(),
      ]);

      const listingStatus = {
        total: 0,
        draft: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        inactive: 0,
        totalViews: 0,
      };

      listingRows.forEach(
        (row) => {
          listingStatus.total +=
            row.count;

          listingStatus.totalViews +=
            row.totalViews || 0;

          if (
            Object.prototype.hasOwnProperty.call(
              listingStatus,
              row._id
            )
          ) {
            listingStatus[
              row._id
            ] = row.count;
          }
        }
      );

      const bookingStatus = {
        total: 0,
        pending: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        grossBookingValue: 0,
      };

      bookingRows.forEach(
        (row) => {
          bookingStatus.total +=
            row.count;

          bookingStatus.grossBookingValue +=
            row.bookingValue || 0;

          if (
            Object.prototype.hasOwnProperty.call(
              bookingStatus,
              row._id
            )
          ) {
            bookingStatus[
              row._id
            ] = row.count;
          }
        }
      );

      const activities = [
        {
          id: `host-created-${host._id}`,
          type: "host_registered",
          title:
            "Host account registered",

          description: `${
            host.name ||
            host.email
          } joined StayNest as a host.`,

          occurredAt:
            host.createdAt,
        },

        ...recentListings.map(
          (listing) => ({
            id: `listing-${listing._id}`,
            type:
              "listing_created",
            title:
              "Listing submitted",

            description: `${listing.title} (${listing.status})`,

            entityId:
              listing._id,

            occurredAt:
              listing.createdAt,
          })
        ),

        ...recentBookings.map(
          (booking) => ({
            id: `booking-${booking._id}`,
            type:
              "booking_received",
            title:
              "Booking received",

            description: `${
              booking.guest?.name ||
              "Guest"
            } booked ${
              booking.apartment
                ?.title ||
              "a listing"
            } (${booking.status})`,

            entityId:
              booking._id,

            occurredAt:
              booking.createdAt,
          })
        ),
      ];

      if (
        host.moderation
          ?.suspendedAt
      ) {
        activities.push({
          id: `host-suspended-${host._id}`,
          type:
            "host_suspended",
          title:
            "Host suspended",

          description:
            host.moderation
              .suspensionReason ||
            "No reason provided.",

          occurredAt:
            host.moderation
              .suspendedAt,
        });
      }

      if (
        host.moderation
          ?.removedAt
      ) {
        activities.push({
          id: `host-removed-${host._id}`,
          type: "host_removed",
          title:
            "Host removed",

          description:
            host.moderation
              .removalReason ||
            "No reason provided.",

          occurredAt:
            host.moderation
              .removedAt,
        });
      }

      activities.sort(
        (first, second) =>
          new Date(
            second.occurredAt ||
              0
          ).getTime() -
          new Date(
            first.occurredAt ||
              0
          ).getTime()
      );

      const hostData =
        host.toObject();

      hostData.accountStatus =
        getAccountStatus(
          hostData
        );

      return sendResponse(
        res,
        200,
        true,
        "Host profile fetched successfully.",
        {
          host: hostData,

          statistics: {
            listings:
              listingStatus,

            bookings:
              bookingStatus,

            revenue: {
              totalRevenue:
                Number(
                  revenueRows[0]
                    ?.totalRevenue ||
                    0
                ),

              successfulPayments:
                Number(
                  revenueRows[0]
                    ?.successfulPayments ||
                    0
                ),

              currency: "INR",
            },
          },

          recentListings,
          recentBookings,

          activities:
            activities.slice(
              0,
              20
            ),
        }
      );
    }
  );

// ======================================
// Suspend Host
// PATCH /api/owner/hosts/:hostId/suspend
// ======================================

const suspendHost = asyncHandler(
  async (req, res) => {
    const reasonCheck =
      validateReason(
        req.body.reason,
        "Suspension"
      );

    if (!reasonCheck.valid) {
      return sendResponse(
        res,
        400,
        false,
        reasonCheck.message
      );
    }

    const host =
      await getHostOrFail(
        req.params.hostId
      );

    if (
      !host ||
      host.isDeleted
    ) {
      return sendResponse(
        res,
        404,
        false,
        "Active host account nahi mila."
      );
    }

    if (
      String(host._id) ===
      String(req.user._id)
    ) {
      return sendResponse(
        res,
        400,
        false,
        "Aap apna account suspend nahi kar sakte."
      );
    }

    if (
      SUSPENDED_STATUSES.includes(
        host.status
      )
    ) {
      return sendResponse(
        res,
        409,
        false,
        "Host account pehle se suspended hai."
      );
    }

    host.status =
      USER_STATUS.SUSPENDED;

    host.moderation =
      host.moderation || {};

    host.moderation.suspensionReason =
      reasonCheck.reason;

    host.moderation.suspendedAt =
      new Date();

    host.moderation.suspendedBy =
      req.user._id;

    await host.save();

    const listingUpdate =
      await Apartment.updateMany(
        {
          host: host._id,

          isDeleted: {
            $ne: true,
          },
        },
        {
          $set: {
            status:
              APARTMENT_STATUS.INACTIVE,

            isFeatured: false,
          },
        }
      );

    return sendResponse(
      res,
      200,
      true,
      "Host suspended successfully.",
      {
        host: {
          _id: host._id,
          name: host.name,
          email: host.email,
          status: host.status,

          accountStatus:
            "suspended",

          moderation:
            host.moderation,
        },

        affectedListings:
          listingUpdate.modifiedCount ||
          0,
      }
    );
  }
);

// ======================================
// Remove Host — Soft Delete
// DELETE /api/owner/hosts/:hostId
// ======================================

const removeHost = asyncHandler(
  async (req, res) => {
    const reasonCheck =
      validateReason(
        req.body.reason,
        "Removal"
      );

    if (!reasonCheck.valid) {
      return sendResponse(
        res,
        400,
        false,
        reasonCheck.message
      );
    }

    const host =
      await getHostOrFail(
        req.params.hostId
      );

    if (
      !host ||
      host.isDeleted ||
      host.status ===
        USER_STATUS.REMOVED
    ) {
      return sendResponse(
        res,
        404,
        false,
        "Host account nahi mila ya remove ho chuka hai."
      );
    }

    if (
      String(host._id) ===
      String(req.user._id)
    ) {
      return sendResponse(
        res,
        400,
        false,
        "Aap apna account remove nahi kar sakte."
      );
    }

    host.isDeleted = true;

    host.status =
      USER_STATUS.REMOVED;

    host.moderation =
      host.moderation || {};

    host.moderation.removalReason =
      reasonCheck.reason;

    host.moderation.removedAt =
      new Date();

    host.moderation.removedBy =
      req.user._id;

    await host.save();

    const listingUpdate =
      await Apartment.updateMany(
        {
          host: host._id,

          isDeleted: {
            $ne: true,
          },
        },
        {
          $set: {
            status:
              APARTMENT_STATUS.INACTIVE,

            isFeatured: false,
          },
        }
      );

    return sendResponse(
      res,
      200,
      true,
      "Host removed successfully.",
      {
        host: {
          _id: host._id,
          name: host.name,
          email: host.email,
          status: host.status,

          accountStatus:
            "removed",

          moderation:
            host.moderation,
        },

        affectedListings:
          listingUpdate.modifiedCount ||
          0,
      }
    );
  }
);

module.exports = {
  getHosts,
  getHostProfile,
  suspendHost,
  removeHost,
};