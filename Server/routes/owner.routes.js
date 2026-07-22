const express = require("express");

const router = express.Router();

const authMiddleware =
  require("../middleware/auth.middleware");

const roleMiddleware =
  require("../middleware/role.middleware");

const {
  getDashboard,
  getPendingApartments,
  getApartmentByIdForOwner,
  approveApartment,
  rejectApartment,
} = require("../controllers/owner.controller");

const ROLES =
  require("../constants/roles");

// ======================================
// Super Admin Authentication
// ======================================

router.use(authMiddleware);

router.use(
  roleMiddleware(
    ROLES.OWNER,
    ROLES.SUPER_ADMIN
  )
);

// ======================================
// Super Admin Dashboard
// ======================================

router.get(
  "/dashboard",
  getDashboard
);

// ======================================
// Apartment Approval Routes
// Existing functionality preserved
// ======================================

router.get(
  "/apartments/pending",
  getPendingApartments
);

router.get(
  "/apartments/:id",
  getApartmentByIdForOwner
);

router.patch(
  "/apartments/:id/approve",
  approveApartment
);

router.patch(
  "/apartments/:id/reject",
  rejectApartment
);

module.exports = router;