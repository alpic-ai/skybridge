import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export function emitManifestModule(
  manifestPath: string,
  outPath: string,
): void {
  const manifest = readFileSync(manifestPath, "utf-8");
  writeFileSync(outPath, `export default ${manifest};\n`);
}

export const VERCEL_API_ENTRY_CONTENT = `export { default } from "../dist/server.js";\n`;

export function emitVercelFunction(root: string): void {
  const apiDir = path.join(root, "api");
  mkdirSync(apiDir, { recursive: true });
  writeFileSync(path.join(apiDir, "mcp.js"), VERCEL_API_ENTRY_CONTENT);
}
