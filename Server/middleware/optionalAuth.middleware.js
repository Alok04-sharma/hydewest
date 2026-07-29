const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

/**
 * Best-effort authentication for public endpoints.
 * Invalid or missing tokens never block the request; a valid token attaches req.user.
 */
const optionalAuthMiddleware = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return next();

    const token = header.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({
      _id: decoded.id,
      isDeleted: { $ne: true },
    }).select("_id role status");

    if (user) req.user = user;
  } catch {
    // Public routes should continue when the optional token is stale or invalid.
  }

  return next();
};

module.exports = optionalAuthMiddleware;
