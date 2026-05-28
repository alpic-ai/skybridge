import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

// Primes the manifest in skybridge's module scope, then dynamically imports
// `./server.js` so user code runs *after* the side channel is set. The
// dynamic import is load-bearing: a static `export { default } from ...` is
// hoisted with the rest of the static graph and would evaluate `server.js`
// before `__setBuildManifest` runs.
export const ENTRY_WRAPPER_CONTENT = `import { __setBuildManifest } from "skybridge/server";
import manifest from "./vite-manifest.js";

__setBuildManifest(manifest);

const userMod = await import("./server.js");
export default userMod.default;
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
