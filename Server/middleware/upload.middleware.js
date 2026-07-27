const multer = require("multer");

const storage = multer.memoryStorage();

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
]);

const fileFilter = (req, file, cb) => {
  if (IMAGE_TYPES.has(file.mimetype) || VIDEO_TYPES.has(file.mimetype)) {
    return cb(null, true);
  }

  return cb(
    new Error("Only JPG, PNG, WEBP, MP4, WEBM and MOV media files are allowed."),
    false
  );
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    // Videos require a larger ceiling; image limits are also validated in the
    // controller so large images are still rejected with a clear message.
    fileSize: 100 * 1024 * 1024,
    files: 15,
  },
});

module.exports = upload;