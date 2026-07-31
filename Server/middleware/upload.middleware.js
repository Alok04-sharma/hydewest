const path = require("path");
const multer = require("multer");
const sendResponse = require("../utils/sendResponse");

const storage = multer.memoryStorage();

// ======================================
// Allowed browser MIME types
// ======================================

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
]);

const VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
]);

const GENERIC_BINARY_TYPES = new Set([
  "application/octet-stream",
  "binary/octet-stream",
  "",
]);

const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".heic",
  ".heif",
]);

const VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".m4v",
  ".mov",
  ".webm",
]);

// ======================================
// Upload file filters
// ======================================

const getLowerExtension = (filename = "") =>
  path.extname(String(filename)).toLowerCase();

const isAllowedImageCandidate = (file) => {
  const mimetype = String(
    file?.mimetype || ""
  ).toLowerCase();

  const extension = getLowerExtension(
    file?.originalname
  );

  return (
    IMAGE_TYPES.has(mimetype) ||
    (
      GENERIC_BINARY_TYPES.has(mimetype) &&
      IMAGE_EXTENSIONS.has(extension)
    )
  );
};

const isAllowedVideoCandidate = (file) => {
  const mimetype = String(
    file?.mimetype || ""
  ).toLowerCase();

  const extension = getLowerExtension(
    file?.originalname
  );

  return (
    VIDEO_TYPES.has(mimetype) ||
    (
      GENERIC_BINARY_TYPES.has(mimetype) &&
      VIDEO_EXTENSIONS.has(extension)
    )
  );
};

const imageFileFilter = (
  _req,
  file,
  callback
) => {
  if (
    isAllowedImageCandidate(file)
  ) {
    return callback(
      null,
      true
    );
  }

  return callback(
    new Error(
      "Only JPG, PNG, WebP, AVIF, HEIC and HEIF image files are allowed."
    )
  );
};

const mediaFileFilter = (
  _req,
  file,
  callback
) => {
  if (
    file.fieldname ===
      "images" &&
    isAllowedImageCandidate(
      file
    )
  ) {
    return callback(
      null,
      true
    );
  }

  if (
    file.fieldname ===
      "videos" &&
    isAllowedVideoCandidate(
      file
    )
  ) {
    return callback(
      null,
      true
    );
  }

  return callback(
    new Error(
      "Only JPG, PNG, WebP, AVIF, HEIC, HEIF, MP4, WebM, M4V and MOV media files are allowed."
    )
  );
};

// ======================================
// Binary signature helpers
// ======================================

const hasBytes = (
  buffer,
  offset,
  expectedBytes
) => {
  if (
    !Buffer.isBuffer(buffer)
  ) {
    return false;
  }

  if (
    offset < 0 ||
    buffer.length <
      offset +
        expectedBytes.length
  ) {
    return false;
  }

  for (
    let index = 0;
    index <
    expectedBytes.length;
    index += 1
  ) {
    if (
      buffer[
        offset + index
      ] !==
      expectedBytes[index]
    ) {
      return false;
    }
  }

  return true;
};

const normalizeBrand = (
  value = ""
) =>
  String(value).replace(
    /\0/g,
    ""
  );

// ======================================
// Read MP4/MOV/AVIF/HEIC container brands
// ======================================

const readIsoBmffBrands = (
  buffer
) => {
  if (
    !Buffer.isBuffer(
      buffer
    ) ||
    buffer.length < 12
  ) {
    return [];
  }

  const brands =
    new Set();

  const scanLimit =
    Math.min(
      buffer.length,
      64 * 1024
    );

  let offset = 0;

  /*
   * Normal ISO-BMFF box parsing.
   *
   * Isse woh files bhi support hongi
   * jinke ftyp box se pehle koi valid
   * leading metadata box present hai.
   */
  while (
    offset + 8 <=
    scanLimit
  ) {
    let boxSize =
      buffer.readUInt32BE(
        offset
      );

    const boxType =
      buffer
        .subarray(
          offset + 4,
          offset + 8
        )
        .toString(
          "ascii"
        );

    let headerSize = 8;

    /*
     * Extended 64-bit box size.
     */
    if (
      boxSize === 1 &&
      offset + 16 <=
        scanLimit
    ) {
      const largeSize =
        Number(
          buffer.readBigUInt64BE(
            offset + 8
          )
        );

      if (
        !Number.isSafeInteger(
          largeSize
        )
      ) {
        break;
      }

      boxSize =
        largeSize;

      headerSize = 16;
    }

    /*
     * Size zero means box continues
     * until the end of the file.
     */
    if (boxSize === 0) {
      boxSize =
        scanLimit -
        offset;
    }

    if (
      boxSize <
        headerSize ||
      offset +
        boxSize >
        scanLimit
    ) {
      break;
    }

    if (
      boxType ===
        "ftyp" &&
      boxSize >=
        headerSize + 8
    ) {
      const payloadStart =
        offset +
        headerSize;

      const majorBrand =
        normalizeBrand(
          buffer
            .subarray(
              payloadStart,
              payloadStart +
                4
            )
            .toString(
              "ascii"
            )
        );

      if (majorBrand) {
        brands.add(
          majorBrand
        );
      }

      /*
       * First four bytes:
       * major brand
       *
       * Next four bytes:
       * minor version
       *
       * Remaining groups:
       * compatible brands
       */
      for (
        let brandOffset =
          payloadStart +
          8;
        brandOffset + 4 <=
        offset + boxSize;
        brandOffset += 4
      ) {
        const compatibleBrand =
          normalizeBrand(
            buffer
              .subarray(
                brandOffset,
                brandOffset +
                  4
              )
              .toString(
                "ascii"
              )
          );

        if (
          compatibleBrand
        ) {
          brands.add(
            compatibleBrand
          );
        }
      }

      return [
        ...brands,
      ];
    }

    offset +=
      boxSize;
  }

  /*
   * Some camera/editor exports contain
   * non-standard leading bytes.
   *
   * Compatibility fallback:
   * first 64 KB mein ftyp marker search.
   */
  const marker =
    Buffer.from(
      "ftyp",
      "ascii"
    );

  const markerOffset =
    buffer
      .subarray(
        0,
        scanLimit
      )
      .indexOf(
        marker
      );

  if (
    markerOffset >= 4 &&
    markerOffset + 12 <=
      scanLimit
  ) {
    const majorBrand =
      normalizeBrand(
        buffer
          .subarray(
            markerOffset +
              4,
            markerOffset +
              8
          )
          .toString(
            "ascii"
          )
      );

    if (majorBrand) {
      brands.add(
        majorBrand
      );
    }

    const compatibleStart =
      markerOffset +
      12;

    const compatibleEnd =
      Math.min(
        scanLimit,
        compatibleStart +
          64
      );

    for (
      let brandOffset =
        compatibleStart;
      brandOffset + 4 <=
      compatibleEnd;
      brandOffset += 4
    ) {
      const compatibleBrand =
        normalizeBrand(
          buffer
            .subarray(
              brandOffset,
              brandOffset +
                4
            )
            .toString(
              "ascii"
            )
        );

      if (
        /^[\x20-\x7E]{3,4}$/.test(
          compatibleBrand
        )
      ) {
        brands.add(
          compatibleBrand
        );
      }
    }
  }

  return [
    ...brands,
  ];
};

// ======================================
// ISO-BMFF image brands
// ======================================

const HEIF_IMAGE_BRANDS =
  new Set([
    "avif",
    "avis",
    "heic",
    "heix",
    "hevc",
    "hevx",
    "heim",
    "heis",
    "hevm",
    "hevs",
    "mif1",
    "msf1",
  ]);

// ======================================
// QuickTime MOV brand
// ======================================

const QUICKTIME_BRANDS =
  new Set([
    "qt  ",
  ]);

// ======================================
// MP4 and M4V video brands
// ======================================

const MP4_VIDEO_BRANDS =
  new Set([
    "isom",
    "iso2",
    "iso3",
    "iso4",
    "iso5",
    "iso6",
    "mp41",
    "mp42",
    "avc1",
    "dash",
    "M4V ",
    "M4VH",
    "M4VP",
    "F4V ",
    "f4v ",
    "3gp4",
    "3gp5",
    "3gp6",
    "3g2a",
    "3g2b",
    "msnv",
  ]);

// ======================================
// Detect ISO-BMFF media subtype
// ======================================

const detectIsoBmffType = (
  buffer
) => {
  const brands =
    readIsoBmffBrands(
      buffer
    );

  if (
    !brands.length
  ) {
    return "unknown";
  }

  if (
    brands.some(
      (brand) =>
        HEIF_IMAGE_BRANDS.has(
          brand
        )
    )
  ) {
    return (
      brands.includes(
        "avif"
      ) ||
      brands.includes(
        "avis"
      )
    )
      ? "avif"
      : "heic";
  }

  if (
    brands.some(
      (brand) =>
        QUICKTIME_BRANDS.has(
          brand
        )
    )
  ) {
    return "mov";
  }

  if (
    brands.some(
      (brand) =>
        MP4_VIDEO_BRANDS.has(
          brand
        )
    )
  ) {
    return "mp4";
  }

  return "unknown";
};

// ======================================
// Detect actual binary file type
// ======================================

const detectFileType = (
  buffer
) => {
  if (
    !Buffer.isBuffer(
      buffer
    ) ||
    buffer.length < 12
  ) {
    return "unknown";
  }

  // JPEG / JPG
  if (
    hasBytes(
      buffer,
      0,
      [
        0xff,
        0xd8,
        0xff,
      ]
    )
  ) {
    return "jpeg";
  }

  // PNG
  if (
    hasBytes(
      buffer,
      0,
      [
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a,
      ]
    )
  ) {
    return "png";
  }

  // WebP:
  // RIFF .... WEBP
  if (
    buffer
      .subarray(
        0,
        4
      )
      .toString(
        "ascii"
      ) ===
      "RIFF" &&
    buffer
      .subarray(
        8,
        12
      )
      .toString(
        "ascii"
      ) ===
      "WEBP"
  ) {
    return "webp";
  }

  // WebM / Matroska EBML header
  if (
    hasBytes(
      buffer,
      0,
      [
        0x1a,
        0x45,
        0xdf,
        0xa3,
      ]
    )
  ) {
    return "webm";
  }

  /*
   * MP4, M4V, MOV, AVIF,
   * HEIC and HEIF all use
   * ISO-BMFF containers.
   */
  return detectIsoBmffType(
    buffer
  );
};

// ======================================
// Allowed detected signatures
// ======================================

const IMAGE_SIGNATURES =
  new Set([
    "jpeg",
    "png",
    "webp",
    "avif",
    "heic",
  ]);

const VIDEO_SIGNATURES =
  new Set([
    "mp4",
    "mov",
    "webm",
  ]);

// ======================================
// Inspect actual uploaded content
// ======================================

const inspectFileSignature = (
  file
) => {
  const detectedType =
    detectFileType(
      file?.buffer
    );

  const fieldname =
    String(
      file?.fieldname ||
        ""
    );

  /*
   * Browser MIME exact match ki
   * requirement intentionally nahi hai.
   *
   * Security actual binary signature
   * aur upload field category se decide
   * hoti hai.
   */
  if (
    fieldname ===
    "images"
  ) {
    return {
      allowed:
        IMAGE_SIGNATURES.has(
          detectedType
        ),

      detectedType,
    };
  }

  if (
    fieldname ===
    "videos"
  ) {
    return {
      allowed:
        VIDEO_SIGNATURES.has(
          detectedType
        ),

      detectedType,
    };
  }

  /*
   * Avatar upload mein field name
   * property images jaisa nahi hota.
   */
  return {
    allowed:
      IMAGE_SIGNATURES.has(
        detectedType
      ),

    detectedType,
  };
};

// ======================================
// Safe filename for logs/responses
// ======================================

const getSafeFilename = (
  value = "file"
) =>
  path
    .basename(
      String(value)
    )
    .replace(
      /[^a-zA-Z0-9._ -]/g,
      "_"
    )
    .slice(
      0,
      120
    );

// ======================================
// Avatar signature middleware
// ======================================

const validateAvatarSignature = (
  req,
  res,
  next
) => {
  if (!req.file) {
    return next();
  }

  const inspection =
    inspectFileSignature(
      req.file
    );

  if (
    !inspection.allowed
  ) {
    if (
      process.env
        .NODE_ENV !==
      "production"
    ) {
      console.warn(
        "[Upload Signature] Rejected avatar",
        {
          filename:
            getSafeFilename(
              req.file
                .originalname
            ),

          claimedMimetype:
            req.file
              .mimetype,

          detectedType:
            inspection
              .detectedType,

          size:
            req.file.size,
        }
      );
    }

    return sendResponse(
      res,
      400,
      false,
      `The selected avatar file is not a supported image. Please export "${getSafeFilename(
        req.file
          .originalname
      )}" as JPG, PNG, WebP, AVIF, HEIC or HEIF and upload it again.`
    );
  }

  return next();
};

// ======================================
// Property media signature middleware
// ======================================

const validatePropertyMediaSignatures =
  (
    req,
    res,
    next
  ) => {
    const images =
      Array.isArray(
        req.files
          ?.images
      )
        ? req.files
            .images
        : [];

    const videos =
      Array.isArray(
        req.files
          ?.videos
      )
        ? req.files
            .videos
        : [];

    const allFiles = [
      ...images,
      ...videos,
    ];

    const invalidFile =
      allFiles
        .map(
          (file) => ({
            file,

            inspection:
              inspectFileSignature(
                file
              ),
          })
        )
        .find(
          (entry) =>
            !entry
              .inspection
              .allowed
        );

    if (invalidFile) {
      const filename =
        getSafeFilename(
          invalidFile
            .file
            .originalname
        );

      if (
        process.env
          .NODE_ENV !==
        "production"
      ) {
        console.warn(
          "[Upload Signature] Rejected property media",
          {
            field:
              invalidFile
                .file
                .fieldname,

            filename,

            claimedMimetype:
              invalidFile
                .file
                .mimetype,

            detectedType:
              invalidFile
                .inspection
                .detectedType,

            size:
              invalidFile
                .file
                .size,
          }
        );
      }

      return sendResponse(
        res,
        400,
        false,
        `The media file "${filename}" is unsupported or damaged. Please export images as JPG, PNG, WebP, AVIF, HEIC or HEIF, and videos as MP4, M4V, MOV or WebM.`
      );
    }

    return next();
  };

// ======================================
// Avatar upload configuration
// ======================================

const avatarUpload =
  multer({
    storage,

    fileFilter:
      imageFileFilter,

    limits: {
      fileSize:
        5 *
        1024 *
        1024,

      files: 1,

      fields: 10,

      parts: 12,
    },
  });

// ======================================
// Property media configuration
// ======================================

const propertyMediaUpload =
  multer({
    storage,

    fileFilter:
      mediaFileFilter,

    limits: {
      /*
       * Per-file maximum size.
       *
       * Controller property images
       * ke liye stricter 8 MB limit
       * separately apply karta hai.
       */
      fileSize:
        12 *
        1024 *
        1024,

      /*
       * Current route:
       * maximum 10 images + 2 videos.
       */
      files: 12,

      fields: 80,

      parts: 100,
    },
  });

// ======================================
// Exports
// ======================================

module.exports =
  propertyMediaUpload;

module.exports.avatarUpload =
  avatarUpload;

module.exports.propertyMediaUpload =
  propertyMediaUpload;

module.exports.validateAvatarSignature =
  validateAvatarSignature;

module.exports.validatePropertyMediaSignatures =
  validatePropertyMediaSignatures;

/*
 * Export testing/debugging ke liye.
 * Normal routes ko is export ki
 * requirement nahi hai.
 */
module.exports.detectFileType =
  detectFileType;