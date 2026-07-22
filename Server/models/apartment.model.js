const mongoose = require("mongoose");

const APARTMENT_STATUS = require("../constants/apartmentStatus");
const CANCELLATION_POLICY = require("../constants/cancellationPolicy");
// const AMENITIES = require("../constants/amenities");


// ======================================================
// Image Schema
// ======================================================

const imageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },

    publicId: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  }
);



// ======================================================
// Apartment Schema
// ======================================================

const apartmentSchema = new mongoose.Schema(
  {

    // ======================================================
    // Host Information
    // ======================================================

    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },


    // ======================================================
    // Basic Information
    // ======================================================

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 100,
    },


    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },


    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 50,
      maxlength: 3000,
    },


    propertyType: {
      type: String,
      required: true,
      enum: [
        "Apartment",
        "House",
        "Villa",
        "Cabin",
        "Farm House",
        "Hotel",
        "Resort",
        "Hostel",
        "Guest House",
      ],
    },


    guests: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },


    bedrooms: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },


    beds: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },


    bathrooms: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },



    // ======================================================
    // Location
    // ======================================================

    location: {

      country: {
        type: String,
        required: true,
        trim: true,
      },


      state: {
        type: String,
        required: true,
        trim: true,
      },


      city: {
        type: String,
        required: true,
        trim: true,
      },


      address: {
        type: String,
        required: true,
        trim: true,
      },


      zipCode: {
        type: String,
        trim: true,
      },


      latitude: {
        type: Number,
        required: true,
      },


      longitude: {
        type: Number,
        required: true,
      },

    },



    // ======================================================
    // Images
    // ======================================================

    images: {

      type: [imageSchema],

      validate: {

        validator: function(value){

          return value.length > 0;

        },

        message:
        "At least one image is required.",

      },

    },



    // ======================================================
    // Pricing
    // ======================================================

    pricing: {

      pricePerNight: {

        type: Number,

        required: true,

        min: 1,

      },


      cleaningFee: {

        type: Number,

        default: 0,

      },


      serviceFee: {

        type: Number,

        default: 0,

      },


      currency: {

        type: String,

        default: "INR",

      },

    },
        // ======================================================
    // Amenities
    // ======================================================

    amenities: [
      {
        type: String,
        trim: true,
      }
    ],



    // ======================================================
    // Availability
    // ======================================================

    availability: {


      availableFrom: {

        type: Date,

        required: true,

      },


      availableTo: {

        type: Date,

        required: true,

      },


      blockedDates: [

        {

          type: Date,

        }

      ],

    },



    // ======================================================
    // Booking Policies
    // ======================================================

    policies: {


      minBookingDays: {

        type: Number,

        default: 1,

        min: 1,

      },


      maxBookingDays: {

        type: Number,

        default: 365,

      },


      cancellationPolicy: {

        type: String,

        enum: Object.values(CANCELLATION_POLICY),

        default: CANCELLATION_POLICY.MODERATE,

      },


    },



    // ======================================================
    // Timezone
    // ======================================================

    timezone: {

      type: String,

      required: true,

      default: "UTC",

    },



    // ======================================================
    // Apartment Status
    // ======================================================

    status: {

      type: String,

      enum: Object.values(APARTMENT_STATUS),

      default: APARTMENT_STATUS.DRAFT,

    },



    // ======================================================
    // Analytics
    // ======================================================

    rating: {

      type: Number,

      default: 0,

      min: 0,

      max: 5,

    },


    totalReviews: {

      type: Number,

      default: 0,

    },


    views: {

      type: Number,

      default: 0,

    },


    bookingCount: {

      type: Number,

      default: 0,

    },


    wishlistCount: {

      type: Number,

      default: 0,

    },



    // ======================================================
    // Featured Apartment
    // ======================================================

    isFeatured: {

      type: Boolean,

      default: false,

    },



    // ======================================================
    // Soft Delete
    // ======================================================

    isDeleted: {

      type: Boolean,

      default: false,

    },


  },

  {

    timestamps: true,

  }

);




// ======================================================
// Indexes
// ======================================================


// Location Search

apartmentSchema.index({

  "location.country": 1,

  "location.state": 1,

  "location.city": 1,

});



// Price Filter

apartmentSchema.index({

  "pricing.pricePerNight": 1,

});



// Host Apartments

apartmentSchema.index({

  host: 1,

});







// Status Filter

apartmentSchema.index({

  status: 1,

});



// Featured Apartments

apartmentSchema.index({

  isFeatured: 1,

});



// Soft Delete

apartmentSchema.index({

  isDeleted: 1,

});



// Full Text Search

apartmentSchema.index({

  title: "text",

  description: "text",

  "location.city": "text",

  "location.state": "text",

  "location.country": "text",

});




// ======================================================
// Export
// ======================================================

module.exports = mongoose.model(
  "Apartment",
  apartmentSchema
);