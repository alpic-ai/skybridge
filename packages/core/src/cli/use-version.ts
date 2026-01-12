import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function findPackageJson(startDir: string): string | null {
  let currentDir = startDir;
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    const packageJsonPath = path.join(currentDir, "package.json");
    if (existsSync(packageJsonPath)) {
      return packageJsonPath;
    }
    currentDir = path.dirname(currentDir);
  }

  return null;
}

export function getPackageVersion(): string {
  const currentFileDir = path.dirname(fileURLToPath(import.meta.url));
  const packageJsonPath = findPackageJson(currentFileDir);

  if (!packageJsonPath) {
    return "";
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
  return packageJson.version || "";
}
