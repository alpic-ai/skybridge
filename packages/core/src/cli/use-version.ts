import { existsSync, readFileSync } from "fs";
import path from "path";
import { useEffect, useState } from "react";
import { fileURLToPath } from "url";

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

function getSkybridgeVersion(): string {
  const currentFileDir = path.dirname(fileURLToPath(import.meta.url));
  const packageJsonPath = findPackageJson(currentFileDir);

  if (!packageJsonPath) {
    return "";
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
  return packageJson.version || "";
}

export const useVersion = () => {
  const [version, setVersion] = useState<string>();

  useEffect(() => {
    const v = getSkybridgeVersion();
    setVersion(v);
  }, []);

  return version;
};
