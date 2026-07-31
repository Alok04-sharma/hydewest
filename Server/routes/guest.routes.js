const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const { paymentLimiter } = require("../middleware/rateLimit.middleware");
const validate = require("../middleware/validate.middleware");
const {
  planOrderSchema,
  paymentVerificationSchema,
} = require("../validators/payment.validator");
const roleMiddleware = require("../middleware/role.middleware");
const ROLES = require("../constants/roles");
const {
  createPriceAlert,
  createSupportTicket,
  createTripPlan,
  deletePriceAlert,
  getDashboard,
  getExclusiveListings,
  getGuestOffers,
  getMyReferral,
  getPriceAlerts,
  getSmartRecommendations,
  getSupportTickets,
  getTrendingDestinations,
  trackReferral,
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
router.post("/referrals/track/:code", trackReferral);

router.use(authMiddleware, roleMiddleware(ROLES.GUEST));

router.get("/dashboard", getDashboard);
router.get("/loyalty", getMyLoyalty);
router.get("/offers", getGuestOffers);
router.get("/trending-destinations", getTrendingDestinations);
router.get("/exclusive-listings", getExclusiveListings);
router.get("/referrals/me", getMyReferral);
router.get("/support", getSupportTickets);
router.post("/support", createSupportTicket);
router.get("/price-alerts", getPriceAlerts);
router.post("/price-alerts", createPriceAlert);
router.delete("/price-alerts/:alertId", deletePriceAlert);
router.get("/recommendations", getSmartRecommendations);
router.post("/trip-planner", createTripPlan);
router.get("/membership", getMyMembership);
router.get("/membership/payments", getMyPayments);
router.post(
  "/membership/create-order",
  paymentLimiter,
  validate(planOrderSchema),
  createOrder
);
router.post(
  "/membership/verify-payment",
  paymentLimiter,
  validate(paymentVerificationSchema),
  verifyPayment
);
router.get("/membership/payments/:paymentId/invoice", downloadInvoice);

module.exports = router;