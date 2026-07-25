const asyncHandler = require("express-async-handler");
const sendResponse = require("../utils/sendResponse");
const { getLoyaltySummary } = require("../services/loyalty.service");

const getMyLoyalty = asyncHandler(async (req, res) => {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
  const summary = await getLoyaltySummary(req.user._id, page, limit);
  return sendResponse(res, 200, true, "Loyalty rewards fetched.", summary);
});

module.exports = { getMyLoyalty };