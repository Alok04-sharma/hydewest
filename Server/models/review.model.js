const mongoose = require("mongoose");



// ======================================
// Review Schema
// ======================================

const reviewSchema = new mongoose.Schema(

  {

    // ======================================
    // User Who Reviewed
    // ======================================

    user: {

      type: mongoose.Schema.Types.ObjectId,

      ref: "User",

      required: true,

      index: true,

    },




    // ======================================
    // Apartment Reference
    // ======================================

    apartment: {

      type: mongoose.Schema.Types.ObjectId,

      ref: "Apartment",

      required: true,

      index: true,

    },




    // ======================================
    // Booking Reference
    // ======================================

    booking: {

      type: mongoose.Schema.Types.ObjectId,

      ref: "Booking",

      required: true,

      unique: true,

    },




    // ======================================
    // Rating
    // ======================================

    rating: {

      type: Number,

      required: true,

      min: 1,

      max: 5,

    },




    // ======================================
    // Review Comment
    // ======================================

    comment: {

      type: String,

      required: true,

      trim: true,

      minlength: 5,

      maxlength: 1000,

    },




    // ======================================
    // Soft Delete
    // ======================================

    isDeleted: {

      type: Boolean,

      default: false,

    },


  },

  {

    timestamps: true,

  }

);





// ======================================
// Prevent Duplicate Review
// One User One Review Per Apartment
// ======================================

reviewSchema.index(

  {

    user: 1,

    apartment: 1,

  },

  {

    unique: true,

  }

);





// ======================================
// Export
// ======================================

module.exports = mongoose.model(

  "Review",

  reviewSchema

);