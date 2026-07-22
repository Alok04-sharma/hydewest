const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

/**
 * Upload a single image buffer to Cloudinary
 * @param {Buffer} buffer
 * @param {String} folder
 * @returns {Promise<Object>}
 */

const uploadToCloudinary = (buffer, folder = "StayNest") => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,

        resource_type: "image",

        transformation: [
          {
            quality: "auto",
            fetch_format: "auto",
          },
        ],
      },

      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

module.exports = uploadToCloudinary;