const asyncHandler = require("express-async-handler");

const crypto = require("crypto");

const razorpay = require("../config/razorpay");

const Payment = require("../models/payment.model");

const Booking = require("../models/booking.model");

const sendResponse = require("../utils/sendResponse");



// ======================================
// Create Razorpay Payment Order
// ======================================

const createPaymentOrder = asyncHandler(async (req, res) => {


  const {
    bookingId,
  } = req.body;



  // ==============================
  // Find Booking
  // ==============================

  const booking = await Booking.findOne({

    _id: bookingId,

    guest: req.user._id,

    isDeleted: false,

  });



  if(!booking){

    return sendResponse(

      res,

      404,

      false,

      "Booking not found."

    );

  }




  // ==============================
  // Check Existing Payment
  // ==============================

  const existingPayment =
    await Payment.findOne({

      booking: booking._id,

      status: "success",

    });



  if(existingPayment){

    return sendResponse(

      res,

      400,

      false,

      "Payment already completed."

    );

  }





  // ==============================
  // Create Razorpay Order
  // ==============================


  const options = {


    amount:
      booking.pricing.totalAmount * 100,


    currency:
      booking.pricing.currency,


    receipt:
      `booking_${booking._id}`,



    notes: {

      bookingId:
        booking._id.toString(),

    },


  };



  const order =
    await razorpay.orders.create(options);





  // ==============================
  // Save Payment
  // ==============================


  const payment =
    await Payment.create({

      user: req.user._id,

      booking: booking._id,


      razorpayOrderId:
        order.id,


      amount:
        booking.pricing.totalAmount,


      currency:
        booking.pricing.currency,


      status:
        "pending",

    });





  return sendResponse(

    res,

    201,

    true,

    "Payment order created successfully.",

    {

      payment,

      order,

    }

  );


});
// ======================================
// Verify Razorpay Payment
// ======================================

const verifyPayment = asyncHandler(async (req, res) => {


  const {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  } = req.body;



  // ==============================
  // Generate Signature
  // ==============================

  const generatedSignature = crypto
    .createHmac(
      "sha256",
      process.env.RAZORPAY_KEY_SECRET
    )
    .update(
      razorpayOrderId +
      "|" +
      razorpayPaymentId
    )
    .digest("hex");




  // ==============================
  // Verify Signature
  // ==============================

  if (
    generatedSignature !== razorpaySignature
  ) {

    return sendResponse(

      res,

      400,

      false,

      "Payment verification failed."

    );

  }





  // ==============================
  // Update Payment
  // ==============================

  const payment =
    await Payment.findOne({

      razorpayOrderId,

    });



  if(!payment){

    return sendResponse(

      res,

      404,

      false,

      "Payment record not found."

    );

  }





  payment.razorpayPaymentId =
    razorpayPaymentId;


  payment.razorpaySignature =
    razorpaySignature;


  payment.status =
    "success";


  payment.paidAt =
    new Date();



  await payment.save();





  // ==============================
  // Confirm Booking
  // ==============================

  await Booking.findByIdAndUpdate(

    payment.booking,

    {

      status: "confirmed",

      paymentStatus: "paid",

    }

  );





  return sendResponse(

    res,

    200,

    true,

    "Payment verified successfully.",

    payment

  );


});




// ======================================
// Payment History
// ======================================

const getPaymentHistory = asyncHandler(async (req, res) => {


  const payments =
    await Payment.find({

      user: req.user._id,

      isDeleted: false,

    })

    .populate(

      "booking",

      "checkIn checkOut pricing status"

    )

    .sort({

      createdAt:-1,

    });




  return sendResponse(

    res,

    200,

    true,

    "Payment history fetched successfully.",

    payments

  );


});





// ======================================
// Export
// ======================================

module.exports = {

  createPaymentOrder,

  verifyPayment,

  getPaymentHistory,

};