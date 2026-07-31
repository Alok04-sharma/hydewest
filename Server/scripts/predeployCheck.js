require("dotenv").config({
  quiet: true,
});

const fs = require("fs");
const path = require("path");

const {
  validateEnv,
} = require("../config/env");

const serverRoot =
  path.resolve(
    __dirname,
    ".."
  );

const projectRoot =
  path.resolve(
    serverRoot,
    ".."
  );

const failures = [];
const warnings = [];

// ======================================
// Validate Render environment
// ======================================

try {
  validateEnv();
} catch (error) {
  failures.push(
    error.message
  );
}

// ======================================
// Ensure reproducible npm installation
// ======================================

if (
  !fs.existsSync(
    path.join(
      serverRoot,
      "package-lock.json"
    )
  )
) {
  failures.push(
    "Server/package-lock.json is required for reproducible npm ci builds."
  );
}

// ======================================
// Detect accidentally included secrets
// ======================================

const forbiddenFiles = [
  ".env",
  "service-account.json",
  "credentials.json",
];

for (
  const file of
  forbiddenFiles
) {
  const locations = [
    path.join(
      projectRoot,
      file
    ),

    path.join(
      serverRoot,
      file
    ),
  ];

  for (
    const absolutePath of
    locations
  ) {
    if (
      !fs.existsSync(
        absolutePath
      )
    ) {
      continue;
    }

    const relativePath =
      path.relative(
        projectRoot,
        absolutePath
      ) || file;

    const message =
      `${relativePath} exists locally. Keep it out of Git and deployment archives.`;

    if (
      String(
        process.env
          .STRICT_ARCHIVE_CHECK ||
          "false"
      ).toLowerCase() ===
      "true"
    ) {
      failures.push(
        message
      );
    } else {
      warnings.push(
        message
      );
    }
  }
}

// ======================================
// Verify repository root .gitignore
// ======================================

const gitignorePath =
  path.join(
    projectRoot,
    ".gitignore"
  );

if (
  !fs.existsSync(
    gitignorePath
  )
) {
  failures.push(
    "A repository-root .gitignore file is required."
  );
} else {
  const gitignore =
    fs.readFileSync(
      gitignorePath,
      "utf8"
    );

  const ignoresEnv =
    /^(?:\*\*\/)?\.env(?:\.\*)?$/m.test(
      gitignore
    );

  if (!ignoresEnv) {
    failures.push(
      "Repository .gitignore must ignore .env files."
    );
  }
}

// ======================================
// Verify Brevo HTTPS mail implementation
// ======================================

const mailServicePath =
  path.join(
    serverRoot,
    "services",
    "mail.service.js"
  );

if (
  !fs.existsSync(
    mailServicePath
  )
) {
  failures.push(
    "Server/services/mail.service.js is required."
  );
} else {
  const mailServiceSource =
    fs.readFileSync(
      mailServicePath,
      "utf8"
    );

  if (
    !mailServiceSource.includes(
      "https://api.brevo.com/v3/smtp/email"
    )
  ) {
    failures.push(
      "mail.service.js is not configured for the Brevo HTTPS email API."
    );
  }

  if (
    mailServiceSource.includes(
      "nodemailer.createTransport"
    )
  ) {
    failures.push(
      "mail.service.js still contains SMTP transport code. Render Free blocks SMTP ports; use the Brevo HTTPS API implementation."
    );
  }
}

// ======================================
// Obsolete environment warnings
// ======================================

if (
  process.env.EMAIL_USER ||
  process.env.EMAIL_PASS
) {
  warnings.push(
    "EMAIL_USER/EMAIL_PASS are obsolete because MAIL_PROVIDER=brevo. They may be removed from Render."
  );
}

if (
  process.env
    .RESEND_API_KEY ||
  process.env
    .RESEND_FROM_EMAIL ||
  process.env
    .RESEND_FROM_NAME
) {
  warnings.push(
    "RESEND_* variables are unused because MAIL_PROVIDER=brevo. They may be removed from Render."
  );
}

// ======================================
// Print result
// ======================================

warnings.forEach(
  (warning) => {
    console.warn(
      `[Predeploy warning] ${warning}`
    );
  }
);

if (failures.length) {
  console.error(
    `Predeploy check failed:\n- ${failures.join(
      "\n- "
    )}`
  );

  process.exit(1);
}

console.log(
  "Predeploy environment and repository checks passed."
);