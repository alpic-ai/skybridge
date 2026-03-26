#!/usr/bin/env node
/**
 * Update skybridge, @skybridge/devtools, and alpic versions
 * in template and example apps
 *
 * Usage:
 *   node scripts/bump.js          # Uses latest published versions
 *   node scripts/bump.js 0.30.0   # Uses specific skybridge version
 */
import { execSync } from "child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = dirname(__dirname);

function getVersion(packageName, expectedVersion, timeoutMs = 10_000) {
  if (!expectedVersion) {
    try {
      return execSync(`npm view ${packageName} version`, {
        encoding: "utf8",
      }).trim();
    } catch {
      console.error(
        `Error: Could not fetch latest version of ${packageName}. Aborting.`,
      );
      process.exit(1);
    }
  }

  let latest;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      latest = execSync(`npm view ${packageName} version`, {
        encoding: "utf8",
      }).trim();
    } catch {
      // no-op
    }
    if (latest === expectedVersion) {
      return latest;
    }
    console.log(
      `Waiting for ${packageName}@${expectedVersion} on npm (got ${latest ?? "error"})…`,
    );
    execSync("sleep 1");
  }

  if (!latest) {
    console.error(
      `Error: Could not fetch latest version of ${packageName}. Aborting.`,
    );
    process.exit(1);
  }

  console.error(
    `Timed out waiting for ${packageName}@${expectedVersion}, using ${latest}`,
  );
  return latest;
}

const explicitVersion = process.argv[2];
const skybridgeVersion = getVersion("skybridge", explicitVersion);
const devtoolsVersion = getVersion("@skybridge/devtools", explicitVersion);
const alpicVersion = getVersion("alpic");

const skybridgeRange = `>=${skybridgeVersion} <1.0.0`;
const devtoolsRange = devtoolsVersion ? `>=${devtoolsVersion} <1.0.0` : null;
const alpicRange = alpicVersion ? `^${alpicVersion}` : null;

console.log(`skybridge:          ${skybridgeRange}`);
if (devtoolsRange) {
  console.log(`@skybridge/devtools: ${devtoolsRange}`);
}
if (alpicRange) {
  console.log(`alpic:               ${alpicRange}`);
}

// Find all example package.json files dynamically
const exampleTargets = [];
for (const dirEntry of readdirSync(join(rootDir, "examples"), {
  withFileTypes: true,
})) {
  const packagePath = `examples/${dirEntry.name}/package.json`;
  if (dirEntry.isDirectory() && existsSync(join(rootDir, packagePath))) {
    exampleTargets.push(packagePath);
  }
}

const targets = [
  "packages/create-skybridge/template/package.json",
  ...exampleTargets,
];

// Update @skybridge/devtools peer dependency in core package
if (devtoolsRange) {
  const corePackagePath = join(rootDir, "packages/core/package.json");
  if (existsSync(corePackagePath)) {
    const corePkg = JSON.parse(readFileSync(corePackagePath, "utf8"));
    if (corePkg.peerDependencies?.["@skybridge/devtools"]) {
      console.log("Updating: packages/core/package.json (peerDependencies)");
      corePkg.peerDependencies["@skybridge/devtools"] = devtoolsRange;
      writeFileSync(corePackagePath, JSON.stringify(corePkg, null, 2) + "\n");
    }
  }
}

for (const target of targets) {
  const file = join(rootDir, target);

  if (!existsSync(file)) {
    console.log(`Skipping (not found): ${target}`);
    continue;
  }

  console.log(`Updating: ${target}`);

  const pkg = JSON.parse(readFileSync(file, "utf8"));

  if (pkg.dependencies?.skybridge) {
    pkg.dependencies.skybridge = skybridgeRange;
  }

  if (devtoolsRange && pkg.devDependencies?.["@skybridge/devtools"]) {
    pkg.devDependencies["@skybridge/devtools"] = devtoolsRange;
  }

  if (alpicRange && pkg.devDependencies?.alpic) {
    pkg.devDependencies.alpic = alpicRange;
  }

  writeFileSync(file, JSON.stringify(pkg, null, 2) + "\n");
}

console.log("\nDone.");
