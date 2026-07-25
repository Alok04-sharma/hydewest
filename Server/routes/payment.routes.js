const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const {
  createPaymentOrder,
  verifyPayment,
  getPaymentHistory,
  downloadPaymentReceipt,
} = require("../controllers/payment.controller");

const router = express.Router();
router.use(authMiddleware);
router.post("/create", createPaymentOrder);
router.post("/verify", verifyPayment);
router.get("/history", getPaymentHistory);
router.get("/:paymentId/receipt", downloadPaymentReceipt);
module.exports = router;