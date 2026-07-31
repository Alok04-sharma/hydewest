const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const USER_STATUS = require("../constants/userStatus");

const optionalAuthMiddleware = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      return next();
    }

    const token = header.slice(7).trim();
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: process.env.JWT_ISSUER || "hydewest-api",
      audience: process.env.JWT_AUDIENCE || "hydewest-client",
      algorithms: ["HS256"],
    });

    if (String(decoded.sub || decoded.id) !== String(decoded.id)) {
      return next();
    }

    const user = await User.findOne({
      _id: decoded.id,
      isDeleted: { $ne: true },
      isVerified: true,
      status: {
        $nin: [
          USER_STATUS.REMOVED,
          USER_STATUS.SUSPENDED,
          USER_STATUS.BLOCKED,
        ],
      },
    }).select("+tokenVersion _id role status isHost");

    if (
      user &&
      Number(decoded.tokenVersion || 0) === Number(user.tokenVersion || 0)
    ) {
      user.tokenVersion = undefined;
      req.user = user;
    }
  } catch {
    // Public endpoints continue when an optional token is absent or invalid.
  }

  return next();
};

module.exports = optionalAuthMiddleware;