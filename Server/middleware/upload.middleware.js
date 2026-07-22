const multer = require("multer");


// ======================================
// Storage Configuration
// ======================================

// Memory storage use kar rahe hain
// File server me save nahi hogi
// Direct Cloudinary jayegi

const storage = multer.memoryStorage();


// ======================================
// File Filter
// ======================================

const fileFilter = (req, file, cb) => {

  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];


  if (allowedTypes.includes(file.mimetype)) {

    cb(null, true);

  } else {

    cb(
      new Error(
        "Only JPG, JPEG, PNG and WEBP images are allowed."
      ),
      false
    );

  }

};



// ======================================
// Multer Configuration
// ======================================

const upload = multer({

  storage,

  fileFilter,


  limits: {

    // 5MB per image

    fileSize: 5 * 1024 * 1024,

  },

});



// ======================================
// Export
// ======================================

module.exports = upload;