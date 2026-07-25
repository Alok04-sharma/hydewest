const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");
const ROLES = require("../constants/roles");
const {
  getDashboard,
  getPriceAlerts,
  createPriceAlert,
  deletePriceAlert,
  getSmartRecommendations,
  createTripPlan,
} = require("../controllers/guest.controller");
const { getMyLoyalty } = require("../controllers/loyalty.controller");
const {
  getPlans,
  getMyMembership,
  getMyPayments,
  createOrder,
  verifyPayment,
  downloadInvoice,
} = require("../controllers/guestMembership.controller");

const router = express.Router();
router.get("/membership/plans", getPlans);
router.use(authMiddleware, roleMiddleware(ROLES.GUEST));
router.get("/dashboard", getDashboard);
router.get("/loyalty", getMyLoyalty);
router.get("/price-alerts", getPriceAlerts);
router.post("/price-alerts", createPriceAlert);
router.delete("/price-alerts/:alertId", deletePriceAlert);
router.get("/recommendations", getSmartRecommendations);
router.post("/trip-planner", createTripPlan);
router.get("/membership", getMyMembership);
router.get("/membership/payments", getMyPayments);
router.post("/membership/create-order", createOrder);
router.post("/membership/verify-payment", verifyPayment);
router.get("/membership/payments/:paymentId/invoice", downloadInvoice);

module.exports = router;