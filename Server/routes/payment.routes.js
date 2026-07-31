const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");
const ROLES = require("../constants/roles");
const validate = require("../middleware/validate.middleware");
const { paymentLimiter } = require("../middleware/rateLimit.middleware");
const {
  bookingPaymentOrderSchema,
  paymentVerificationSchema,
} = require("../validators/payment.validator");
const {
  createPaymentOrder,
  verifyPayment,
  getPaymentHistory,
  downloadPaymentReceipt,
} = require("../controllers/payment.controller");

const router = express.Router();
router.use(authMiddleware, roleMiddleware(ROLES.GUEST));
router.post(
  "/create",
  paymentLimiter,
  validate(bookingPaymentOrderSchema),
  createPaymentOrder
);
router.post(
  "/verify",
  paymentLimiter,
  validate(paymentVerificationSchema),
  verifyPayment
);
router.get("/history", getPaymentHistory);
router.get("/:paymentId/receipt", downloadPaymentReceipt);
module.exports = router;