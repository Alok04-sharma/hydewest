const asyncHandler = require("express-async-handler");

const Review = require("../models/review.model");

const Apartment = require("../models/apartment.model");

const Booking = require("../models/booking.model");

const sendResponse = require("../utils/sendResponse");




// ======================================
// Create Review
// ======================================

const createReview = asyncHandler(async (req, res) => {


  const { apartmentId } = req.params;


  const {

    bookingId,

    rating,

    comment,

  } = req.body;






  // ==============================
  // Check Booking
  // ==============================

  const booking = await Booking.findOne({

    _id: bookingId,

    user: req.user._id,

    apartment: apartmentId,

    status: "completed",

  });





  if(!booking){


    return sendResponse(

      res,

      400,

      false,

      "Only completed bookings can be reviewed."

    );


  }







  // ==============================
  // Check Existing Review
  // ==============================

  const existingReview =

    await Review.findOne({

      user:req.user._id,

      apartment:apartmentId,

    });





  if(existingReview){


    return sendResponse(

      res,

      400,

      false,

      "You already reviewed this apartment."

    );


  }







  // ==============================
  // Create Review
  // ==============================

  const review = await Review.create({

    user:req.user._id,

    apartment:apartmentId,

    booking:bookingId,

    rating,

    comment,

  });







  // ==============================
  // Update Apartment Rating
  // ==============================

  const reviews = await Review.find({

    apartment: apartmentId,

    isDeleted:false,

  });




  const totalReviews = reviews.length;




  const averageRating =

    reviews.reduce(

      (sum, item)=> sum + item.rating,

      0

    ) / totalReviews;







  await Apartment.findByIdAndUpdate(

    apartmentId,

    {

      rating:

        Number(averageRating.toFixed(1)),

      totalReviews,

    }

  );







  return sendResponse(

    res,

    201,

    true,

    "Review created successfully.",

    review

  );


});









// ======================================
// Get Apartment Reviews
// ======================================

const getApartmentReviews = asyncHandler(async(req,res)=>{


  const { apartmentId } = req.params;





  const reviews = await Review.find({

    apartment: apartmentId,

    isDeleted:false,

  })

  .populate(

    "user",

    "name avatar"

  )

  .sort({

    createdAt:-1,

  });








  return sendResponse(

    res,

    200,

    true,

    "Reviews fetched successfully.",

    reviews

  );


});









// ======================================
// Delete Review
// ======================================

const deleteReview = asyncHandler(async(req,res)=>{


  const { reviewId } = req.params;






  const review = await Review.findOne({

    _id:reviewId,

    user:req.user._id,

  });







  if(!review){


    return sendResponse(

      res,

      404,

      false,

      "Review not found."

    );


  }







  review.isDeleted = true;


  await review.save();






  return sendResponse(

    res,

    200,

    true,

    "Review deleted successfully."

  );


});








// ======================================
// Export
// ======================================

module.exports = {


  createReview,


  getApartmentReviews,


  deleteReview,


};