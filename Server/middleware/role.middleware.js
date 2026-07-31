const sendResponse = require("../utils/sendResponse");

const roleMiddleware = (...allowedRoles) => {
  const formattedAllowed = allowedRoles.map((role) =>
    String(role || "").toLowerCase()
  );

  return (req, res, next) => {
    if (!req.user) {
      return sendResponse(res, 401, false, "Authentication required.");
    }

    const userRole = String(req.user.role || "").toLowerCase();

    // Administrators are not silently treated as Guests or Hosts. Sensitive
    // actions must explicitly list every role that is allowed to perform them.
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