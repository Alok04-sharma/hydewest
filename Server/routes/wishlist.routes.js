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

  addToWishlist,

  removeFromWishlist,

  getMyWishlist,

} = require("../controllers/wishlist.controller");






// ======================================
// Wishlist Routes
// ======================================



// Add Apartment To Wishlist

router.post(

  "/add/:apartmentId",

  authMiddleware,

  addToWishlist

);






// Remove Apartment From Wishlist

router.delete(

  "/remove/:apartmentId",

  authMiddleware,

  removeFromWishlist

);






// Get My Wishlist

router.get(

  "/",

  authMiddleware,

  getMyWishlist

);






module.exports = router;