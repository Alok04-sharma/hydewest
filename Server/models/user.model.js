const mongoose = require("mongoose");

const ROLES = require("../constants/roles");
const USER_STATUS = require("../constants/userStatus");

const moderationSchema = new mongoose.Schema(
  {
    suspensionReason: {
      type: String,
      trim: true,
      default: "",
    },

    suspendedAt: {
      type: Date,
      default: null,
    },

    suspendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    removalReason: {
      type: String,
      trim: true,
      default: "",
    },

    removedAt: {
      type: Date,
      default: null,
    },

    removedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    _id: false,
  }
);

const userSchema = new mongoose.Schema(
  {
    // =========================
    // Basic Information
    // =========================
    name: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    avatar: {
      type: String,
      default: "",
    },

    phone: {
      type: String,
      default: "",
    },

    // =========================
    // User Role
    // =========================
    role: {
      type: String,
      enum: {
        values: Object.values(ROLES),
        message: "{VALUE} is not a valid role",
      },
      default: ROLES.GUEST,
      index: true,
    },

    // =========================
    // Authentication
    // =========================
    isVerified: {
      type: Boolean,
      default: false,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    // =========================
    // Host Information
    // =========================
    isHost: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Phase-1 host commercial profile. These fields mirror the active
    // subscription state for fast authorization and analytics queries.
    subscriptionStatus: {
      type: String,
      enum: ["none", "pending", "active", "scheduled", "expired", "cancelled"],
      default: "none",
      index: true,
    },

    subscriptionExpiry: {
      type: Date,
      default: null,
      index: true,
    },

    freeListingCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    commissionPercentage: {
      type: Number,
      default: 30,
      min: 0,
      max: 100,
    },

    // =========================
    // Account Status
    // =========================
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.ACTIVE,
      index: true,
    },

    moderation: {
      type: moderationSchema,
      default: () => ({}),
    },

    // =========================
    // User Timezone
    // =========================
    timezone: {
      type: String,
      default: "UTC",
    },

    // =========================
    // Soft Delete
    // =========================
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({
  role: 1,
  status: 1,
  isDeleted: 1,
});

userSchema.index({
  name: 1,
  email: 1,
  phone: 1,
});

module.exports = mongoose.model(
  "User",
  userSchema
);