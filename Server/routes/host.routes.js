const express = require("express");

const router = express.Router();

// ======================================
// Middleware
// ======================================

const authMiddleware = require("../middleware/auth.middleware");

const roleMiddleware = require("../middleware/role.middleware");


// ======================================
// Controller
// ======================================

const {
  getDashboardStats,
  getMyApartments,
  getPendingApartments,
  getApprovedApartments,
  getRejectedApartments,
  getInactiveApartments,
} = require("../controllers/host.controller");


// ======================================
// Constants
// ======================================

const ROLES = require("../constants/roles");


// ======================================
// Host Protection
// ======================================

router.use(authMiddleware);

router.use(
  roleMiddleware(ROLES.HOST)
);


// ======================================
// Dashboard
// ======================================

router.get(
  "/dashboard",
  getDashboardStats
);


// ======================================
// Apartments
// ======================================

// All Host Apartments
router.get(
  "/apartments",
  getMyApartments
);


// Pending Apartments
router.get(
  "/apartments/pending",
  getPendingApartments
);


// Approved Apartments
router.get(
  "/apartments/approved",
  getApprovedApartments
);


// Rejected Apartments
router.get(
  "/apartments/rejected",
  getRejectedApartments
);


// Inactive Apartments
router.get(
  "/apartments/inactive",
  getInactiveApartments
);


module.exports = router;