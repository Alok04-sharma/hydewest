const mongoose = require("mongoose");

const ROLES = require("../constants/roles");
const USER_STATUS = require("../constants/userStatus");

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
    },

    // =========================
    // Authentication
    // =========================
    isVerified: {
      type: Boolean,
      default: false,
    },

    // =========================
    // Host Information
    // =========================
    isHost: {
      type: Boolean,
      default: false,
    },

    // =========================
    // Account Status
    // =========================
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.ACTIVE,
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
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);