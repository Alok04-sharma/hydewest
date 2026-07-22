const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const sendResponse = require("../utils/sendResponse");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
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

    const user = await User.findById(decoded.id)
      .select("-__v");

    if (!user) {
      return sendResponse(
        res,
        404,
        false,
        "User not found."
      );
    }

    if (user.isDeleted) {
      return sendResponse(
        res,
        403,
        false,
        "This account has been deleted."
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