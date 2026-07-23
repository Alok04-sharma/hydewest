const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");

const Apartment = require("../models/apartment.model");
const User = require("../models/user.model");

const APARTMENT_STATUS = require("../constants/apartmentStatus");
const USER_STATUS = require("../constants/userStatus");
const NOTIFICATION_TYPE = require("../constants/notificationType");

const sendResponse = require("../utils/sendResponse");
const {
  createAdminNotifications,
  createUserNotification,
} = require("../services/notification.service");
const { getHostSubscriptionSummary } = require("../services/subscription.service");

// ======================================
// Escape Regex
// ======================================

const escapeRegex = (value = "") => {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

// ======================================
// Validate Admin Reason
// ======================================

const validateReason = (reason, label) => {
  const normalized = String(reason || "").trim();

  if (normalized.length < 10) {
    return {
      valid: false,
      message: `${label} reason kam se kam 10 characters ka hona chahiye.`,
    };
  }

  if (normalized.length > 500) {
    return {
      valid: false,
      message: `${label} reason maximum 500 characters ka ho sakta hai.`,
    };
  }

  return {
    valid: true,
    reason: normalized,
  };
};

// ======================================
// Ensure Legacy Listing Fields
// ======================================

const ensureModerationFields = (listing) => {
  if (!listing.moderation) {
    listing.moderation = {};
  }

  if (!Array.isArray(listing.statusHistory)) {
    listing.statusHistory = [];
  }
};

// ======================================
// Add Listing Status History
// ======================================

const addHistory = (
  listing,
  {
    action,
    reason = "",
    changedBy,
  }
) => {
  ensureModerationFields(listing);

  listing.statusHistory.push({
    status: listing.status,
    action,
    reason,
    changedBy,
    changedAt: new Date(),
  });
};

// ======================================
// Find Listing
// ======================================

const getListingOrNull = async (listingId) => {
  if (!mongoose.isValidObjectId(listingId)) {
    return null;
  }

  return Apartment.findById(listingId);
};

// ======================================
// View All / Search Listings
// GET /api/owner/listings
// ======================================

const getListings = asyncHandler(async (req, res) => {
  const page = Math.max(
    Number.parseInt(req.query.page, 10) || 1,
    1
  );

  const limit = Math.min(
    Math.max(
      Number.parseInt(req.query.limit, 10) || 10,
      1
    ),
    50
  );

  const allowedStatuses = [
    "all",
    APARTMENT_STATUS.PENDING,
    APARTMENT_STATUS.APPROVED,
    APARTMENT_STATUS.SUSPENDED,
    "removed",
  ];

  const status = allowedStatuses.includes(
    req.query.status
  )
    ? req.query.status
    : "all";

  const search = String(
    req.query.search || ""
  ).trim();

  const city = String(
    req.query.city || ""
  ).trim();

  const propertyType = String(
    req.query.propertyType || ""
  ).trim();

  const hostId = String(
    req.query.hostId || ""
  ).trim();

  const sortBy = String(
    req.query.sortBy || "newest"
  );

  const query = {};

  if (status === "removed") {
    query.isDeleted = true;
  } else {
    query.isDeleted = false;

    if (status !== "all") {
      query.status = status;
    }
  }

  if (city) {
    query["location.city"] = {
      $regex: escapeRegex(city),
      $options: "i",
    };
  }

  if (propertyType) {
    query.propertyType = propertyType;
  }

  if (
    hostId &&
    mongoose.isValidObjectId(hostId)
  ) {
    query.host = hostId;
  }

  if (search) {
    const searchRegex = new RegExp(
      escapeRegex(search),
      "i"
    );

    const matchingHosts = await User.find({
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
    }).distinct("_id");

    query.$or = [
      {
        title: searchRegex,
      },
      {
        description: searchRegex,
      },
      {
        propertyType: searchRegex,
      },
      {
        "location.city": searchRegex,
      },
      {
        "location.state": searchRegex,
      },
      {
        "location.address": searchRegex,
      },
      {
        host: {
          $in: matchingHosts,
        },
      },
    ];
  }

  const sortMap = {
    newest: {
      createdAt: -1,
    },

    oldest: {
      createdAt: 1,
    },

    price_low: {
      "pricing.pricePerNight": 1,
    },

    price_high: {
      "pricing.pricePerNight": -1,
    },

    most_viewed: {
      views: -1,
    },

    most_booked: {
      bookingCount: -1,
    },
  };

  const skip = (page - 1) * limit;

  const [
    listings,
    total,
    allListings,
    pending,
    approved,
    suspended,
    removed,
  ] = await Promise.all([
    Apartment.find(query)
      .populate(
        "host",
        "name email phone avatar status isDeleted"
      )
      .sort(
        sortMap[sortBy] ||
          sortMap.newest
      )
      .skip(skip)
      .limit(limit)
      .lean(),

    Apartment.countDocuments(query),

    Apartment.countDocuments({}),

    Apartment.countDocuments({
      status:
        APARTMENT_STATUS.PENDING,
      isDeleted: false,
    }),

    Apartment.countDocuments({
      status:
        APARTMENT_STATUS.APPROVED,
      isDeleted: false,
    }),

    Apartment.countDocuments({
      status:
        APARTMENT_STATUS.SUSPENDED,
      isDeleted: false,
    }),

    Apartment.countDocuments({
      isDeleted: true,
    }),
  ]);

  const formattedListings = listings.map(
    (listing) => ({
      ...listing,

      adminStatus: listing.isDeleted
        ? "removed"
        : listing.status,
    })
  );

  return sendResponse(
    res,
    200,
    true,
    "Listings fetched successfully.",
    {
      listings: formattedListings,

      summary: {
        total: allListings,
        pending,
        approved,
        suspended,
        removed,
      },

      pagination: {
        page,
        limit,
        total,

        totalPages: Math.max(
          Math.ceil(total / limit),
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
        city,
        propertyType,
        hostId,
        sortBy,
      },
    }
  );
});

// ======================================
// Open Listing Details / Images
// GET /api/owner/listings/:listingId
// ======================================

const getListingDetails = asyncHandler(
  async (req, res) => {
    if (
      !mongoose.isValidObjectId(
        req.params.listingId
      )
    ) {
      return sendResponse(
        res,
        400,
        false,
        "Invalid listing ID."
      );
    }

    const listing = await Apartment.findById(
      req.params.listingId
    )
      .populate(
        "host",
        [
          "name",
          "email",
          "phone",
          "avatar",
          "role",
          "status",
          "isDeleted",
          "isVerified",
          "createdAt",
          "lastLoginAt",
        ].join(" ")
      )
      .populate(
        "moderation.reviewedBy",
        "name email role"
      )
      .populate(
        "moderation.suspendedBy",
        "name email role"
      )
      .populate(
        "moderation.removedBy",
        "name email role"
      )
      .populate(
        "statusHistory.changedBy",
        "name email role"
      )
      .lean();

    if (!listing) {
      return sendResponse(
        res,
        404,
        false,
        "Listing not found."
      );
    }

    return sendResponse(
      res,
      200,
      true,
      "Listing details fetched successfully.",
      {
        ...listing,

        adminStatus:
          listing.isDeleted
            ? "removed"
            : listing.status,
      }
    );
  }
);

// ======================================
// Approve New Listing
// PATCH /api/owner/listings/:listingId/approve
// ======================================

const approveListing = asyncHandler(
  async (req, res) => {
    const listing =
      await getListingOrNull(
        req.params.listingId
      );

    if (!listing) {
      return sendResponse(
        res,
        404,
        false,
        "Listing not found."
      );
    }

    if (listing.isDeleted) {
      return sendResponse(
        res,
        409,
        false,
        "Removed listing approve nahi ki ja sakti."
      );
    }

    if (
      listing.status ===
      APARTMENT_STATUS.APPROVED
    ) {
      return sendResponse(
        res,
        409,
        false,
        "Listing pehle se approved hai."
      );
    }

    const host = await User.findById(
      listing.host
    ).select(
      "status isDeleted role isHost"
    );

    const blockedHostStatuses = [
      USER_STATUS.SUSPENDED,
      USER_STATUS.BLOCKED,
      USER_STATUS.REMOVED,
    ].filter(Boolean);

    /*
     * Important fix:
     *
     * Purane host documents me status field absent
     * ho sakta hai. Missing status ko active maana
     * jayega.
     *
     * Sirf explicitly suspended, blocked, removed
     * ya deleted host ki listing approve nahi hogi.
     */
    const hostCannotBeApproved =
      !host ||
      host.isDeleted === true ||
      blockedHostStatuses.includes(
        host.status
      );

    if (hostCannotBeApproved) {
      return sendResponse(
        res,
        409,
        false,
        "Suspended ya removed host ki listing approve nahi ki ja sakti."
      );
    }

    /*
     * Legacy host record me status missing ho to
     * permanently active value save kar do.
     */
    if (!host.status) {
      host.status =
        USER_STATUS.ACTIVE;

      await host.save();
    }

    const subscriptionSummary = await getHostSubscriptionSummary(host._id);

    if (!subscriptionSummary.isActive) {
      return sendResponse(
        res,
        409,
        false,
        "Host ki active subscription nahi hai. Listing approve karne se pehle Host ko plan purchase ya renew karna hoga."
      );
    }

    ensureModerationFields(listing);

    listing.status =
      APARTMENT_STATUS.APPROVED;

    listing.isFeatured = false;

    listing.moderation.reviewedBy =
      req.user._id;

    listing.moderation.reviewedAt =
      new Date();

    listing.moderation.approvedAt =
      new Date();

    /*
     * Purana suspension/rejection metadata clear.
     */
    listing.moderation.suspensionReason =
      "";

    listing.moderation.suspendedAt =
      null;

    listing.moderation.suspendedBy =
      null;

    if (
      Object.prototype.hasOwnProperty.call(
        listing.moderation,
        "rejectionReason"
      )
    ) {
      listing.moderation.rejectionReason =
        "";
    }

    if (
      Object.prototype.hasOwnProperty.call(
        listing.moderation,
        "rejectedAt"
      )
    ) {
      listing.moderation.rejectedAt =
        null;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        listing.moderation,
        "rejectedBy"
      )
    ) {
      listing.moderation.rejectedBy =
        null;
    }

    addHistory(listing, {
      changedBy: req.user._id,

      action:
        "approved_by_super_admin",

      reason: String(
        req.body.note ||
          "Listing approved after review."
      ).trim(),
    });

    await listing.save();

    const approvedListing =
      await Apartment.findById(
        listing._id
      )
        .populate(
          "host",
          "name email phone avatar status isDeleted"
        )
        .populate(
          "moderation.reviewedBy",
          "name email role"
        )
        .populate(
          "statusHistory.changedBy",
          "name email role"
        );

    await createUserNotification({
      recipient: listing.host,
      type: NOTIFICATION_TYPE.LISTING_APPROVED,
      title: "Your listing was approved",
      message: `“${listing.title}” has been approved and is now visible to Guests while your Host subscription remains active.`,
      actor: req.user._id,
      entityType: "Apartment",
      entityId: listing._id,
      actionUrl: "/host/dashboard",
      eventKey: `listing-approved:${listing._id}:${listing.moderation.approvedAt.getTime()}`,
      metadata: {
        listingId: listing._id,
        status: APARTMENT_STATUS.APPROVED,
        approvedAt: listing.moderation.approvedAt,
      },
    });

    return sendResponse(
      res,
      200,
      true,
      "Listing approved successfully.",
      approvedListing
    );
  }
);

// ======================================
// Suspend Existing Listing
// PATCH /api/owner/listings/:listingId/suspend
// ======================================

const suspendListing = asyncHandler(
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

    const listing =
      await getListingOrNull(
        req.params.listingId
      );

    if (
      !listing ||
      listing.isDeleted
    ) {
      return sendResponse(
        res,
        404,
        false,
        "Active listing not found."
      );
    }

    if (
      listing.status ===
      APARTMENT_STATUS.SUSPENDED
    ) {
      return sendResponse(
        res,
        409,
        false,
        "Listing pehle se suspended hai."
      );
    }

    ensureModerationFields(listing);

    listing.status =
      APARTMENT_STATUS.SUSPENDED;

    listing.isFeatured = false;

    listing.moderation.reviewedBy =
      req.user._id;

    listing.moderation.reviewedAt =
      new Date();

    listing.moderation.suspensionReason =
      reasonCheck.reason;

    listing.moderation.suspendedAt =
      new Date();

    listing.moderation.suspendedBy =
      req.user._id;

    addHistory(listing, {
      changedBy: req.user._id,

      action:
        "suspended_by_super_admin",

      reason:
        reasonCheck.reason,
    });

    await listing.save();

    await createAdminNotifications({
      type: NOTIFICATION_TYPE.LISTING_SUSPENDED,
      title: "Listing suspended",
      message: `“${listing.title}” was suspended by ${req.user?.name || req.user?.email || "Super Admin"}.`,
      actor: req.user._id,
      entityType: "Apartment",
      entityId: listing._id,
      actionUrl: `/owner/listings/${listing._id}`,
      metadata: {
        listingId: listing._id,
        hostId: listing.host,
        reason: reasonCheck.reason,
      },
    });

    await createUserNotification({
      recipient: listing.host,
      type: NOTIFICATION_TYPE.LISTING_SUSPENDED,
      title: "Your listing was suspended",
      message: `“${listing.title}” was suspended by the platform. Reason: ${reasonCheck.reason}`,
      actor: req.user._id,
      entityType: "Apartment",
      entityId: listing._id,
      actionUrl: "/host/dashboard",
      eventKey: `listing-suspended:${listing._id}:${listing.moderation.suspendedAt.getTime()}`,
      metadata: {
        listingId: listing._id,
        status: APARTMENT_STATUS.SUSPENDED,
        reason: reasonCheck.reason,
        suspendedAt: listing.moderation.suspendedAt,
      },
    });

    return sendResponse(
      res,
      200,
      true,
      "Listing suspended successfully.",
      listing
    );
  }
);

// ======================================
// Remove Policy Violating Listing
// DELETE /api/owner/listings/:listingId
// ======================================

const removeListing = asyncHandler(
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

    const listing =
      await getListingOrNull(
        req.params.listingId
      );

    if (
      !listing ||
      listing.isDeleted
    ) {
      return sendResponse(
        res,
        404,
        false,
        "Listing not found or already removed."
      );
    }

    ensureModerationFields(listing);

    listing.isDeleted = true;

    listing.status =
      APARTMENT_STATUS.INACTIVE;

    listing.isFeatured = false;

    listing.moderation.removedAt =
      new Date();

    listing.moderation.removedBy =
      req.user._id;

    listing.moderation.removalReason =
      reasonCheck.reason;

    addHistory(listing, {
      changedBy: req.user._id,

      action:
        "removed_by_super_admin",

      reason:
        reasonCheck.reason,
    });

    await listing.save();

    await createUserNotification({
      recipient: listing.host,
      type: NOTIFICATION_TYPE.LISTING_REMOVED,
      title: "Your listing was removed",
      message: `“${listing.title}” was removed for a policy violation. Reason: ${reasonCheck.reason}`,
      actor: req.user._id,
      entityType: "Apartment",
      entityId: listing._id,
      actionUrl: "/host/dashboard",
      eventKey: `listing-removed:${listing._id}:${listing.moderation.removedAt.getTime()}`,
      metadata: {
        listingId: listing._id,
        reason: reasonCheck.reason,
        removedAt: listing.moderation.removedAt,
      },
    });

    return sendResponse(
      res,
      200,
      true,
      "Listing removed successfully.",
      {
        _id: listing._id,
        title: listing.title,
        adminStatus: "removed",
        isDeleted: true,
        moderation:
          listing.moderation,
      }
    );
  }
);

module.exports = {
  getListings,
  getListingDetails,
  approveListing,
  suspendListing,
  removeListing,
};