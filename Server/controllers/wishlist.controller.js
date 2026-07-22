const asyncHandler = require("express-async-handler");

const Wishlist = require("../models/wishlist.model");

const Apartment = require("../models/apartment.model");

const sendResponse = require("../utils/sendResponse");




// ======================================
// Add Apartment To Wishlist
// ======================================

const addToWishlist = asyncHandler(async (req, res) => {


  const { apartmentId } = req.params;



  // ==============================
  // Check Apartment
  // ==============================

  const apartment = await Apartment.findOne({

    _id: apartmentId,

    isDeleted: false,

  });



  if(!apartment){


    return sendResponse(

      res,

      404,

      false,

      "Apartment not found."

    );


  }






  // ==============================
  // Find User Wishlist
  // ==============================

  let wishlist = await Wishlist.findOne({

    user: req.user._id,

  });






  // Create New Wishlist

  if(!wishlist){


    wishlist = await Wishlist.create({

      user:req.user._id,

      apartments:[apartmentId],

    });




    return sendResponse(

      res,

      201,

      true,

      "Apartment added to wishlist.",

      wishlist

    );


  }







  // ==============================
  // Duplicate Check
  // ==============================

  if(

    wishlist.apartments.includes(apartmentId)

  ){


    return sendResponse(

      res,

      400,

      false,

      "Apartment already in wishlist."

    );


  }







  wishlist.apartments.push(

    apartmentId

  );




  await wishlist.save();







  return sendResponse(

    res,

    200,

    true,

    "Apartment added to wishlist.",

    wishlist

  );


});








// ======================================
// Remove Apartment From Wishlist
// ======================================

const removeFromWishlist = asyncHandler(async (req,res)=>{


  const { apartmentId } = req.params;





  const wishlist =
    await Wishlist.findOne({

      user:req.user._id,

    });






  if(!wishlist){


    return sendResponse(

      res,

      404,

      false,

      "Wishlist not found."

    );


  }







  wishlist.apartments =

    wishlist.apartments.filter(

      (id)=>

        id.toString() !== apartmentId

    );






  await wishlist.save();







  return sendResponse(

    res,

    200,

    true,

    "Apartment removed from wishlist.",

    wishlist

  );


});








// ======================================
// Get My Wishlist
// ======================================

const getMyWishlist = asyncHandler(async(req,res)=>{


  const wishlist =

    await Wishlist.findOne({

      user:req.user._id,

      isDeleted:false,

    })

    .populate({

      path:"apartments",

      populate:{

        path:"host",

        select:"name email avatar",

      }

    });






  if(!wishlist){


    return sendResponse(

      res,

      200,

      true,

      "Wishlist is empty.",

      []

    );


  }







  return sendResponse(

    res,

    200,

    true,

    "Wishlist fetched successfully.",

    wishlist

  );


});








// ======================================
// Export
// ======================================

module.exports = {


  addToWishlist,


  removeFromWishlist,


  getMyWishlist,


};