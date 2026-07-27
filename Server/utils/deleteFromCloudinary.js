const cloudinary = require("../config/cloudinary");

const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  if (!publicId) return null;

  try {
    return await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });
  } catch (error) {
    console.error(
      `Cloudinary ${resourceType} delete failed for ${publicId}:`,
      error.message
    );
    return null;
  }
};

module.exports = deleteFromCloudinary;