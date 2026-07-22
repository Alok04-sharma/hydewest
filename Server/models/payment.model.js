const mongoose = require("mongoose");


// ======================================
// Payment Status
// ======================================

const PAYMENT_STATUS = Object.freeze({

  PENDING: "pending",

  SUCCESS: "success",

  FAILED: "failed",

  REFUNDED: "refunded",

});




// ======================================
// Payment Schema
// ======================================

const paymentSchema = new mongoose.Schema(

  {


    // ======================================
    // User Information
    // ======================================

    user: {

      type: mongoose.Schema.Types.ObjectId,

      ref: "User",

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
    
    },



    // ======================================
    // Razorpay Details
    // ======================================

    razorpayOrderId: {

      type: String,

      required: true,

      index: true,

    },


    razorpayPaymentId: {

      type: String,

      default: "",

    },


    razorpaySignature: {

      type: String,

      default: "",

    },



    // ======================================
    // Amount Details
    // ======================================

    amount: {

      type: Number,

      required: true,

    },


    currency: {

      type: String,

      default: "INR",

    },



    // ======================================
    // Payment Status
    // ======================================

    status: {

      type: String,

      enum: Object.values(PAYMENT_STATUS),

      default: PAYMENT_STATUS.PENDING,

      index: true,

    },



    // ======================================
    // Payment Date
    // ======================================

    paidAt: {

      type: Date,

    },



    // ======================================
    // Extra Data
    // ======================================

    metadata: {

      type: Object,

      default: {},

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
// Indexes
// ======================================

paymentSchema.index({

  user: 1,

  createdAt: -1,

});


paymentSchema.index({

  booking: 1,

});



// ======================================
// Export
// ======================================

module.exports = mongoose.model(
  "Payment",
  paymentSchema
);