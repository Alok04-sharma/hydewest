const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");
const ROLES = require("../constants/roles");
const {
  getPlans,
  getMySubscription,
  getMySubscriptionPayments,
  createSubscriptionOrder,
  verifySubscriptionPayment,
} = require("../controllers/subscription.controller");

router.get("/plans", getPlans);

router.use(authMiddleware);
router.use(roleMiddleware(ROLES.HOST));

router.get("/my", getMySubscription);
router.get("/my/payments", getMySubscriptionPayments);
router.post("/create-order", createSubscriptionOrder);
router.post("/verify-payment", verifySubscriptionPayment);

module.exports = router;
