import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

// Handles two `dist/server.js` shapes:
// - new: `export default server` — wrapper sets the manifest and awaits run().
// - legacy: `export default await server.run()` (pre-wrapper templates) —
//   wrapper passes the value through so existing projects keep booting after
//   a skybridge upgrade without rebuilding.
export const ENTRY_WRAPPER_CONTENT = `import manifest from "./vite-manifest.js";
import userExport from "./server.js";

let resolved;
if (userExport && typeof userExport.setViteManifest === "function") {
  userExport.setViteManifest(manifest);
  resolved = await userExport.run();
} else {
  resolved = userExport;
}

export default resolved;
`;

export function emitEntryWrapper(distDir: string): void {
  writeFileSync(path.join(distDir, "__entry.js"), ENTRY_WRAPPER_CONTENT);
}

export function emitManifestModule(
  manifestPath: string,
  outPath: string,
): void {
  const manifest = readFileSync(manifestPath, "utf-8");
  writeFileSync(outPath, `export default ${manifest};\n`);
}
