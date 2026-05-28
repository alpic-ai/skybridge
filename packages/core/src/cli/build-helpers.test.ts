import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ENTRY_WRAPPER_CONTENT, emitEntryWrapper } from "./build-helpers.js";

function mkTmp(prefix = "skybridge-build-helpers-") {
  return mkdtempSync(path.join(tmpdir(), prefix));
}

describe("emitEntryWrapper", () => {
  it("writes dist/__entry.js with backward-compatible manifest + run() wiring", () => {
    const dir = mkTmp();
    emitEntryWrapper(dir);
    const out = readFileSync(path.join(dir, "__entry.js"), "utf-8");
    expect(out).toBe(ENTRY_WRAPPER_CONTENT);
    expect(out).toContain('import manifest from "./vite-manifest.js"');
    expect(out).toContain('import userExport from "./server.js"');
    expect(out).toContain('typeof userExport.setViteManifest === "function"');
    expect(out).toContain("userExport.setViteManifest(manifest)");
    expect(out).toContain("await userExport.run()");
    expect(out).toContain("export default resolved");
  });
});
