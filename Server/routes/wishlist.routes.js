const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");
const ROLES = require("../constants/roles");
const { addToWishlist, removeFromWishlist, getMyWishlist } = require("../controllers/wishlist.controller");

const router = express.Router();
router.use(authMiddleware, roleMiddleware(ROLES.GUEST));
router.get("/", getMyWishlist);
router.post("/", addToWishlist);
router.post("/add/:apartmentId", addToWishlist);
router.delete("/:apartmentId", removeFromWishlist);
router.delete("/remove/:apartmentId", removeFromWishlist);
module.exports = router;