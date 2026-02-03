#!/usr/bin/env node
/**
 * Update skybridge version in template and example apps
 *
 * Usage:
 *   node scripts/bump.js          # Uses latest published version
 *   node scripts/bump.js 0.30.0   # Uses specific version
 */
import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = dirname(__dirname);

// Get version from arg or fetch latest from npm
let version = process.argv[2];
if (!version) {
  try {
    version = execSync("npm view skybridge version", {
      encoding: "utf8",
    }).trim();
  } catch {
    console.error("Error: Could not fetch latest version from npm");
    process.exit(1);
  }
}

console.log(`Setting skybridge version to: ${version}`);

const versionRange = `>=${version} <1.0.0`;

const targets = [
  "packages/create-skybridge/template/package.json",
  "examples/capitals/package.json",
  "examples/everything/package.json",
  "examples/ecom-carousel/package.json",
  "examples/productivity/package.json",
];

for (const target of targets) {
  const file = join(rootDir, target);

  if (!existsSync(file)) {
    console.log(`Skipping (not found): ${target}`);
    continue;
  }

  console.log(`Updating: ${target}`);

  const pkg = JSON.parse(readFileSync(file, "utf8"));

  if (pkg.dependencies?.skybridge) {
    pkg.dependencies.skybridge = versionRange;
  }

  writeFileSync(file, JSON.stringify(pkg, null, 2) + "\n");
}

console.log(`Done. Updated to skybridge ${versionRange}`);
