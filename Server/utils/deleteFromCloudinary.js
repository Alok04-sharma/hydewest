const cloudinary = require("../config/cloudinary");

const deleteFromCloudinary = async (publicId) => {
  if (!publicId) {
    return null;
  }

  try {
    return await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });
  } catch (error) {
    console.error(`Cloudinary delete failed for ${publicId}:`, error.message);
    return null;
  }
};

module.exports = deleteFromCloudinary;