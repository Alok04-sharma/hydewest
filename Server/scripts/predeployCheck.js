require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { validateEnv } = require("../config/env");

const serverRoot = path.resolve(__dirname, "..");
const projectRoot = path.resolve(serverRoot, "..");
const failures = [];
const warnings = [];

try {
  validateEnv();
} catch (error) {
  failures.push(error.message);
}

if (!fs.existsSync(path.join(serverRoot, "package-lock.json"))) {
  failures.push("Server/package-lock.json is required for reproducible npm ci builds.");
}

const forbiddenFiles = [".env", "service-account.json", "credentials.json"];
for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(serverRoot, file))) {
    const message = `${file} exists locally. Keep it out of Git and deployment archives.`;

    if (String(process.env.STRICT_ARCHIVE_CHECK || "false").toLowerCase() === "true") {
      failures.push(message);
    } else {
      warnings.push(message);
    }
  }
}

const gitignorePath = path.join(projectRoot, ".gitignore");
if (!fs.existsSync(gitignorePath)) {
  failures.push("A repository-root .gitignore file is required.");
} else {
  const gitignore = fs.readFileSync(gitignorePath, "utf8");
  if (!/^\.env(?:\.\*)?$/m.test(gitignore) && !/^\.env$/m.test(gitignore)) {
    failures.push("Repository .gitignore must ignore .env files.");
  }
}

warnings.forEach((warning) => console.warn(`[Predeploy warning] ${warning}`));

if (failures.length) {
  console.error("Predeploy check failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Predeploy environment and repository checks passed.");