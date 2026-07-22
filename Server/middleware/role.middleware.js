const sendResponse = require("../utils/sendResponse");
const ROLES = require("../constants/roles");

const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendResponse(
        res,
        401,
        false,
        "Authentication required."
      );
    }

    const userRole = String(req.user.role || "").toLowerCase();

    // Grant full access to "super_admin", "owner", "admin"
    if (userRole === "super_admin" || userRole === "owner" || userRole === "admin") {
      return next();
    }

    const formattedAllowed = allowedRoles.map((r) => String(r).toLowerCase());

    if (formattedAllowed.includes(userRole)) {
      return next();
    }

    return sendResponse(
      res,
      403,
      false,
      `Only ${allowedRoles.join(" or ")} can access this resource.`
    );
  };
};

module.exports = roleMiddleware;