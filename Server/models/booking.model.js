const mongoose = require("mongoose");


// ======================================
// Booking Status
// ======================================

const BOOKING_STATUS = Object.freeze({
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
});


// ======================================
// Payment Status
// ======================================

const PAYMENT_STATUS = Object.freeze({
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
});


// ======================================
// Booking Schema
// ======================================

const bookingSchema = new mongoose.Schema(
  {

    // ======================================
    // Guest Information
    // ======================================

    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },


    // ======================================
    // Apartment Information
    // ======================================

    apartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Apartment",
      required: true,
      index: true,
    },


    // Host reference
    // Analytics ke liye useful

    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },


    // ======================================
    // Booking Dates
    // ======================================

    checkIn: {
      type: Date,
      required: true,
    },


    checkOut: {
      type: Date,
      required: true,
    },


    guestsCount: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },


    // ======================================
    // Pricing Snapshot
    // ======================================

    pricing: {

      pricePerNight: {
        type: Number,
        required: true,
      },


      totalNights: {
        type: Number,
        required: true,
      },


      subtotal: {
        type: Number,
        required: true,
      },


      cleaningFee: {
        type: Number,
        default: 0,
      },


      serviceFee: {
        type: Number,
        default: 0,
      },


      totalAmount: {
        type: Number,
        required: true,
      },


      currency: {
        type: String,
        default: "INR",
      },

    },


    // ======================================
    // Booking Status
    // ======================================

    status: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.PENDING,
      index: true,
    },


    // ======================================
    // Payment Status
    // ======================================

    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },


    // ======================================
    // Cancellation Details
    // ======================================

    cancellation: {

      cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },


      cancelledAt: {
        type: Date,
      },


      reason: {
        type: String,
        trim: true,
      },

    },


    // ======================================
    // Guest Message
    // ======================================

    message: {
      type: String,
      trim: true,
      maxlength: 500,
    },


    // ======================================
    // Soft Delete
    // ======================================

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },


  },
  {
    timestamps: true,
  }
);



// ======================================
// Custom Validation
// ======================================

bookingSchema.pre("save", function(next){

  if(this.checkOut <= this.checkIn){

    return next(
      new Error(
        "Check-out date must be after check-in date."
      )
    );

  }

  next();

});



// ======================================
// Indexes
// ======================================


// Apartment booking search

bookingSchema.index({
  apartment: 1,
  checkIn: 1,
  checkOut: 1,
});


// Guest bookings

bookingSchema.index({
  guest: 1,
  createdAt: -1,
});


// Host bookings

bookingSchema.index({
  host: 1,
  createdAt: -1,
});



// ======================================
// Export
// ======================================

module.exports = mongoose.model(
  "Booking",
  bookingSchema
);