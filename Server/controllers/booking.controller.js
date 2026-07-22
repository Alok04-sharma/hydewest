const asyncHandler = require("express-async-handler");

const Booking = require("../models/booking.model");

const Apartment = require("../models/apartment.model");

const sendResponse = require("../utils/sendResponse");

const BOOKING_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
};


// ======================================
// Create Booking
// ======================================

const createBooking = asyncHandler(async (req, res) => {

  const guestId = req.user._id;


  const {
    apartmentId,
    checkIn,
    checkOut,
    guestsCount,
    message,
  } = req.body;



  // ==============================
  // Find Apartment
  // ==============================

  const apartment = await Apartment.findOne({

    _id: apartmentId,

    status: "approved",

    isDeleted: false,

  });



  if(!apartment){

    return sendResponse(
      res,
      404,
      false,
      "Apartment not available."
    );

  }



  // ==============================
  // Calculate Nights
  // ==============================

  const startDate = new Date(checkIn);

  const endDate = new Date(checkOut);


  const timeDifference =
    endDate - startDate;


  const totalNights =
    Math.ceil(
      timeDifference /
      (1000 * 60 * 60 * 24)
    );



  if(totalNights <= 0){

    return sendResponse(
      res,
      400,
      false,
      "Invalid booking dates."
    );

  }



  // ==============================
  // Price Calculation
  // ==============================

  const pricePerNight =
    apartment.pricing.pricePerNight;


  const subtotal =
    pricePerNight * totalNights;


  const cleaningFee =
    apartment.pricing.cleaningFee || 0;


  const serviceFee =
    apartment.pricing.serviceFee || 0;


  const totalAmount =
    subtotal +
    cleaningFee +
    serviceFee;



  // ==============================
  // Create Booking
  // ==============================

  const booking = await Booking.create({

    guest: guestId,

    apartment: apartment._id,

    host: apartment.host,


    checkIn,

    checkOut,


    guestsCount,


    pricing: {

      pricePerNight,

      totalNights,

      subtotal,

      cleaningFee,

      serviceFee,

      totalAmount,

      currency:
        apartment.pricing.currency,

    },


    status:
      BOOKING_STATUS.PENDING,


    message,

  });



  return sendResponse(

    res,

    201,

    true,

    "Booking created successfully.",

    booking

  );


});




// ======================================
// Get My Bookings (Guest)
// ======================================

const getMyBookings = asyncHandler(async (req,res)=>{


  const bookings = await Booking.find({

    guest:req.user._id,

    isDeleted:false,

  })

  .populate(
    "apartment",
    "title images location pricing"
  )

  .sort({
    createdAt:-1,
  });



  return sendResponse(

    res,

    200,

    true,

    "Bookings fetched successfully.",

    bookings

  );


});
// ======================================
// Get Host Bookings
// ======================================

const getHostBookings = asyncHandler(async (req, res) => {

  const bookings = await Booking.find({

    host: req.user._id,

    isDeleted: false,

  })

    .populate(
      "guest",
      "name email avatar phone"
    )

    .populate(
      "apartment",
      "title images location"
    )

    .sort({
      createdAt: -1,
    });



  return sendResponse(

    res,

    200,

    true,

    "Host bookings fetched successfully.",

    bookings

  );

});




// ======================================
// Cancel Booking
// ======================================

const cancelBooking = asyncHandler(async (req, res) => {

  const { id } = req.params;



  const booking = await Booking.findOne({

    _id: id,

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



  if(
    booking.status === BOOKING_STATUS.CANCELLED
  ){

    return sendResponse(

      res,

      400,

      false,

      "Booking already cancelled."

    );

  }



  booking.status =
    BOOKING_STATUS.CANCELLED;



  booking.cancellation = {

    cancelledBy: req.user._id,

    cancelledAt: new Date(),

    reason:
      req.body.reason || "Cancelled by guest",

  };



  await booking.save();



  return sendResponse(

    res,

    200,

    true,

    "Booking cancelled successfully.",

    booking

  );


});




// ======================================
// Export Controllers
// ======================================

module.exports = {

  createBooking,

  getMyBookings,

  getHostBookings,

  cancelBooking,

};