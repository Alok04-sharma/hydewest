const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");
const upload = require("../middleware/upload.middleware");
const activeSubscriptionMiddleware = require("../middleware/activeSubscription.middleware");
const ROLES = require("../constants/roles");

const {
  createApartment,
  getAllApartments,
  getApartmentDetails,
  getHostApartments,
  getHostApartmentDetails,
  updateApartment,
  deleteApartment,
  getListingQuote,
  searchApartments,
} = require("../controllers/apartment.controller");

// Public static routes first.
router.get("/search", searchApartments);
router.get("/", getAllApartments);

// Host-owned listing routes must stay before public /:id.
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
router.get(
  "/host/:id",
  authMiddleware,
  roleMiddleware(ROLES.HOST),
  getHostApartmentDetails
);

router.post(
  "/create",
  authMiddleware,
  roleMiddleware(ROLES.HOST),
  activeSubscriptionMiddleware,
  upload.array("images", 10),
  createApartment
);

// Quote supports advanced pricing and host coupon codes.
router.post("/:id/quote", getListingQuote);

router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(ROLES.HOST),
  activeSubscriptionMiddleware,
  upload.array("images", 10),
  updateApartment
);

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(ROLES.HOST),
  deleteApartment
);

router.get("/:id", getApartmentDetails);

module.exports = router;
