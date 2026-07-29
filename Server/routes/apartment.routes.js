const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const optionalAuthMiddleware = require("../middleware/optionalAuth.middleware");
const roleMiddleware = require("../middleware/role.middleware");
const upload = require("../middleware/upload.middleware");
const activeSubscriptionMiddleware = require("../middleware/activeSubscription.middleware");
const ROLES = require("../constants/roles");

const {
  getNameSuggestions,
  improveDescription,
  createPriceSuggestion,
  resolvePriceSuggestion,
} = require("../controllers/listingAi.controller");

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
router.get("/search", optionalAuthMiddleware, searchApartments);
router.get("/", getAllApartments);

// Phase-1 OpenRouter helpers. No key is exposed to the browser.
router.post(
  "/ai/name-suggestions",
  authMiddleware,
  roleMiddleware(ROLES.HOST),
  getNameSuggestions
);
router.post(
  "/ai/improve-description",
  authMiddleware,
  roleMiddleware(ROLES.HOST),
  improveDescription
);
router.post(
  "/ai/price-suggestion",
  authMiddleware,
  roleMiddleware(ROLES.HOST),
  createPriceSuggestion
);
router.patch(
  "/:id/ai-price-suggestions/:suggestionId",
  authMiddleware,
  roleMiddleware(ROLES.HOST),
  resolvePriceSuggestion
);

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
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "videos", maxCount: 5 },
  ]),
  createApartment
);

// Quote supports advanced pricing and host coupon codes.
router.post("/:id/quote", getListingQuote);

router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(ROLES.HOST),
  activeSubscriptionMiddleware,
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "videos", maxCount: 5 },
  ]),
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