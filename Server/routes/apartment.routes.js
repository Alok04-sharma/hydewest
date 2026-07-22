const express = require("express");
const router = express.Router();

// ======================================
// Middleware
// ======================================
const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");
const upload = require("../middleware/upload.middleware");

// ======================================
// Controller
// ======================================
const {
  createApartment,
  getAllApartments,
  getApartmentDetails,
  getHostApartments,
  updateApartment,
  deleteApartment,
  searchApartments,
} = require("../controllers/apartment.controller");

// ======================================
// Constants
// ======================================
const ROLES = require("../constants/roles");

// ======================================
// 1. PUBLIC GENERAL ROUTES (Static First)
// ======================================

// Search Apartments
router.get(
  "/search",
  searchApartments
);

// Get All Approved Apartments
router.get(
  "/",
  getAllApartments
);

// ======================================
// 2. HOST SPECIFIC ROUTES (MUST BE BEFORE /:id)
// ======================================

// Get Host Apartments (Supporting both /host and /host/my to avoid frontend URL mismatch)
router.get(
  "/host",
  authMiddleware,
  roleMiddleware(ROLES.HOST),
  getHostApartments
);

router.get(
  "/host/my",
  authMiddleware,
  roleMiddleware(ROLES.HOST),
  getHostApartments
);

// Create Apartment
router.post(
  "/create",
  authMiddleware,
  roleMiddleware(ROLES.HOST),
  upload.array("images", 10),
  createApartment
);

// ======================================
// 3. DYNAMIC PARAMETER ROUTES (MUST BE AFTER STATIC ROUTES)
// ======================================

// Get Single Apartment Details
router.get(
  "/:id",
  getApartmentDetails
);

// Update Apartment
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(ROLES.HOST),
  updateApartment
);

// Delete Apartment
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(ROLES.HOST),
  deleteApartment
);

module.exports = router;