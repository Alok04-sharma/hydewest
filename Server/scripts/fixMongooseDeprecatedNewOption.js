const fs = require("fs");
const path = require("path");

// ======================================
// Server root directory
// ======================================

const SERVER_ROOT = path.resolve(__dirname, "..");

// ======================================
// Files containing deprecated Mongoose
// `new: true` update options
// ======================================

const TARGET_FILES = [
  "controllers/apartment.controller.js",
  "controllers/chat.controller.js",
  "controllers/guest.controller.js",
  "controllers/notification.controller.js",
  "controllers/ownerListing.controller.js",
  "controllers/ownerNotification.controller.js",
  "controllers/support.controller.js",

  "services/loyalty.service.js",
  "services/notification.service.js",
  "services/referral.service.js",
  "services/revenue.service.js",
  "services/searchAnalytics.service.js",
];

// ======================================
// Deprecated and new Mongoose options
// ======================================

const DEPRECATED_OPTION_PATTERN =
  /\bnew\s*:\s*true\b/g;

const REPLACEMENT =
  'returnDocument: "after"';

// ======================================
// Migration counters
// ======================================

let totalReplacements = 0;

const changedFiles = [];

// ======================================
// Update every affected file
// ======================================

for (const relativePath of TARGET_FILES) {
  const absolutePath = path.join(
    SERVER_ROOT,
    relativePath
  );

  // File missing hone par migration stop nahi hogi.
  if (!fs.existsSync(absolutePath)) {
    console.warn(
      `[SKIPPED] File not found: ${relativePath}`
    );

    continue;
  }

  const source = fs.readFileSync(
    absolutePath,
    "utf8"
  );

  const matches = source.match(
    DEPRECATED_OPTION_PATTERN
  );

  const replacementCount =
    matches?.length || 0;

  // Already fixed file ko dobara modify nahi karega.
  if (replacementCount === 0) {
    console.log(
      `[UNCHANGED] ${relativePath}`
    );

    continue;
  }

  const updatedSource = source.replace(
    DEPRECATED_OPTION_PATTERN,
    REPLACEMENT
  );

  fs.writeFileSync(
    absolutePath,
    updatedSource,
    "utf8"
  );

  totalReplacements += replacementCount;

  changedFiles.push({
    relativePath,
    replacementCount,
  });

  console.log(
    `[UPDATED] ${relativePath} (${replacementCount} replacement${
      replacementCount === 1 ? "" : "s"
    })`
  );
}

// ======================================
// Migration summary
// ======================================

console.log(
  "\nMongoose deprecation migration complete."
);

console.log(
  `Changed files: ${changedFiles.length}`
);

console.log(
  `Total replacements: ${totalReplacements}`
);

if (totalReplacements === 0) {
  console.log(
    'No deprecated "new: true" options were found. The project may already be fixed.'
  );
}