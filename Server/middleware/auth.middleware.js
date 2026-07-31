const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const USER_STATUS = require("../constants/userStatus");
const sendResponse = require("../utils/sendResponse");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendResponse(res, 401, false, "Access denied. Please login first.");
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      return sendResponse(res, 401, false, "Access denied. Please login first.");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: process.env.JWT_ISSUER || "hydewest-api",
      audience: process.env.JWT_AUDIENCE || "hydewest-client",
      algorithms: ["HS256"],
    });

    if (String(decoded.sub || decoded.id) !== String(decoded.id)) {
      return sendResponse(res, 401, false, "Invalid authentication session.");
    }

    const user = await User.findById(decoded.id)
      .select("+tokenVersion -__v");

    if (!user) {
      return sendResponse(res, 401, false, "Invalid authentication session.");
    }

    if (Number(decoded.tokenVersion || 0) !== Number(user.tokenVersion || 0)) {
      return sendResponse(
        res,
        401,
        false,
        "This session has been signed out. Please login again."
      );
    }

    if (!user.isVerified) {
      return sendResponse(
        res,
        403,
        false,
        "Please verify your email before continuing."
      );
    }

    if (user.isDeleted || user.status === USER_STATUS.REMOVED) {
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

    user.tokenVersion = undefined;
    req.user = user;
    req.authTokenVersion = Number(decoded.tokenVersion || 0);
    return next();
  } catch {
    return sendResponse(res, 401, false, "Invalid or expired token.");
  }
};

module.exports = authMiddleware;