import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ENTRY_WRAPPER_CONTENT,
  emitEntryWrapper,
  emitManifestModule,
} from "./build-helpers.js";

function mkTmp(prefix = "skybridge-build-helpers-") {
  return mkdtempSync(path.join(tmpdir(), prefix));
}

describe("emitEntryWrapper", () => {
  it("writes dist/__entry.js that primes the manifest before importing user code", () => {
    const dir = mkTmp();
    emitEntryWrapper(dir);
    const out = readFileSync(path.join(dir, "__entry.js"), "utf-8");
    expect(out).toBe(ENTRY_WRAPPER_CONTENT);
    expect(out).toContain(
      'import { __setBuildManifest } from "skybridge/server"',
    );
    expect(out).toContain('import manifest from "./vite-manifest.js"');
    expect(out).toContain("__setBuildManifest(manifest)");
    // Dynamic import is load-bearing: `server.js` must evaluate after the
    // setter runs, so a static re-export wouldn't work.
    expect(out).toContain('await import("./server.js")');
    expect(out).toContain("export default userMod.default");
  });
});

describe("emitManifestModule", () => {
  it("wraps the manifest JSON as an ESM default export", () => {
    const dir = mkTmp();
    const manifestPath = path.join(dir, "manifest.json");
    const outPath = path.join(dir, "vite-manifest.js");
    const manifest = '{\n  "index.tsx": { "file": "assets/index-abc.js" }\n}';
    writeFileSync(manifestPath, manifest);

    emitManifestModule(manifestPath, outPath);

    const out = readFileSync(outPath, "utf-8");
    expect(out).toBe(`export default ${manifest};\n`);
  });
});
