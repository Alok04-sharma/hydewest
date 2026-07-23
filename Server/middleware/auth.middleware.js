const jwt = require("jsonwebtoken");

const User = require("../models/user.model");
const USER_STATUS = require("../constants/userStatus");
const sendResponse = require("../utils/sendResponse");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return sendResponse(
        res,
        401,
        false,
        "Access denied. Please login first."
      );
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const user = await User.findById(
      decoded.id
    ).select("-__v");

    if (!user) {
      return sendResponse(
        res,
        404,
        false,
        "User not found."
      );
    }

    if (
      user.isDeleted ||
      user.status === USER_STATUS.REMOVED
    ) {
      return sendResponse(
        res,
        403,
        false,
        "This account has been removed by the platform."
      );
    }

    if (
      user.status === USER_STATUS.SUSPENDED ||
      user.status === USER_STATUS.BLOCKED
    ) {
      return sendResponse(
        res,
        403,
        false,
        user.moderation?.suspensionReason
          ? `This account is suspended: ${user.moderation.suspensionReason}`
          : "This account is suspended. Please contact platform support."
      );
    }

    req.user = user;

    next();
  } catch (error) {
    return sendResponse(
      res,
      401,
      false,
      "Invalid or expired token."
    );
  }
};

module.exports = authMiddleware;