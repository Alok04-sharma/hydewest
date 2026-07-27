const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

/**
 * Upload an image or video buffer to Cloudinary.
 * The resource type is inferred from mimetype unless explicitly supplied.
 */
const uploadToCloudinary = (
  buffer,
  folder = "hydewest",
  { mimetype = "image/jpeg", resourceType = "" } = {}
) => {
  const resolvedResourceType =
    resourceType || (String(mimetype).startsWith("video/") ? "video" : "image");

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resolvedResourceType,
        ...(resolvedResourceType === "image"
          ? {
              transformation: [
                { quality: "auto", fetch_format: "auto" },
              ],
            }
          : {
              eager: [
                {
                  format: "jpg",
                  resource_type: "video",
                  start_offset: "0",
                },
              ],
            }),
      },
      (error, result) => {
        if (error) return reject(error);

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: resolvedResourceType,
          duration: Number(result.duration || 0),
          thumbnailUrl:
            resolvedResourceType === "video"
              ? result.eager?.[0]?.secure_url ||
                result.secure_url.replace(/\.[^.]+$/, ".jpg")
              : "",
        });
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

module.exports = uploadToCloudinary;