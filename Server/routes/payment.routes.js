const express = require("express");

const router = express.Router();


// ======================================
// Middleware
// ======================================

const authMiddleware = require("../middleware/auth.middleware");



// ======================================
// Controller
// ======================================

const {
  createPaymentOrder,
  verifyPayment,
  getPaymentHistory,
} = require("../controllers/payment.controller");





// ======================================
// Payment Routes
// ======================================



// Create Razorpay Order

router.post(

  "/create",

  authMiddleware,

  createPaymentOrder

);





// Verify Payment

router.post(

  "/verify",

  authMiddleware,

  verifyPayment

);





// Payment History

router.get(

  "/history",

  authMiddleware,

  getPaymentHistory

);





module.exports = router;