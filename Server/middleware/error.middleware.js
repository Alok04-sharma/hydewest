const sendResponse = require("../utils/sendResponse");

const errorHandler = (err, req, res, next) => {
  console.error("❌ Error:", err);

  // Mongoose Validation Error
  if (err.name === "ValidationError") {
    return sendResponse(
      res,
      400,
      false,
      Object.values(err.errors)[0].message
    );
  }

  // Duplicate Key Error
  if (err.code === 11000) {
    return sendResponse(
      res,
      409,
      false,
      "Resource already exists."
    );
  }

  // JWT Error
  if (err.name === "JsonWebTokenError") {
    return sendResponse(
      res,
      401,
      false,
      "Invalid token."
    );
  }

  // JWT Expired
  if (err.name === "TokenExpiredError") {
    return sendResponse(
      res,
      401,
      false,
      "Token has expired."
    );
  }

  // Default Error
  return sendResponse(
    res,
    err.statusCode || 500,
    false,
    err.message || "Internal Server Error"
  );
};

module.exports = errorHandler;