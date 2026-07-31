const express = require("express");

const router = express.Router();

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
  getPlans,
  getMySubscription,
  getMySubscriptionPayments,
  createSubscriptionOrder,
  verifySubscriptionPayment,
  downloadMySubscriptionInvoice,
} = require("../controllers/subscription.controller");

router.get("/plans", getPlans);

router.use(authMiddleware);
router.use(roleMiddleware(ROLES.HOST));

router.get("/my", getMySubscription);
router.get("/my/payments", getMySubscriptionPayments);
router.get(
  "/my/payments/:paymentId/invoice",
  downloadMySubscriptionInvoice
);
router.post(
  "/create-order",
  paymentLimiter,
  validate(planOrderSchema),
  createSubscriptionOrder
);
router.post(
  "/verify-payment",
  paymentLimiter,
  validate(paymentVerificationSchema),
  verifySubscriptionPayment
);

module.exports = router;