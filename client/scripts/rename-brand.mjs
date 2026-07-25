import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const clientRoot = path.resolve(scriptDirectory, "..");
const ignoredDirectories = new Set(["node_modules", "dist", ".git", "coverage"]);
const supportedExtensions = new Set([".js", ".jsx", ".ts", ".tsx", ".html", ".css", ".json", ".md"]);

async function collectFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolutePath)));
      continue;
    }

    if (supportedExtensions.has(path.extname(entry.name))) files.push(absolutePath);
  }

  return files;
}

const files = await collectFiles(clientRoot);
let changedFiles = 0;

for (const filePath of files) {
  if (filePath === fileURLToPath(import.meta.url)) continue;
  const original = await fs.readFile(filePath, "utf8");
  const updated = original
    .replaceAll("StayNest", "hydewest")
    .replaceAll("STAYNEST", "HYDEWEST");

  if (updated !== original) {
    await fs.writeFile(filePath, updated, "utf8");
    changedFiles += 1;
  }
}

console.log(`hydewest branding applied to ${changedFiles} file(s).`);
console.log("Lowercase technical keys such as staynest_token and CSS class names were intentionally preserved.");