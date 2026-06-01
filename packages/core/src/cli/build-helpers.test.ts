// @vitest-environment node
// esbuild's invariant check on TextEncoder/Uint8Array trips jsdom's polyfill.
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ENTRY_WRAPPER_CONTENT,
  emitEntryWrapper,
  emitManifestModule,
  emitVercelBuildOutput,
  VERCEL_CONFIG,
  VERCEL_VC_CONFIG,
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
  it("inlines the JSON manifest as an ESM default export", () => {
    const dir = mkTmp();
    const inPath = path.join(dir, "manifest.json");
    const outPath = path.join(dir, "vite-manifest.js");
    const manifest = { "src/views/foo.tsx": { file: "assets/foo-abc.js" } };
    writeFileSync(inPath, JSON.stringify(manifest));
    emitManifestModule(inPath, outPath);
    const out = readFileSync(outPath, "utf-8");
    expect(out.startsWith("export default ")).toBe(true);
    const literal = out
      .slice("export default ".length)
      .trim()
      .replace(/;$/, "");
    expect(JSON.parse(literal)).toEqual(manifest);
  });
});

describe("emitVercelBuildOutput", () => {
  it("emits a Build Output API tree with bundled function and static assets", async () => {
    const root = mkTmp();
    mkdirSync(path.join(root, "dist", "assets"), { recursive: true });
    writeFileSync(
      path.join(root, "dist", "server.js"),
      "export default function handler(_req, res) { res.end('ok'); }\n",
    );
    // Minimal `dist/__entry.js` (the real wrapper imports `skybridge/server`,
    // which isn't resolvable in this test's tmp dir — the function-bundling
    // contract we care about here is just "bundle whatever `__entry.js`
    // imports into a single function file").
    writeFileSync(
      path.join(root, "dist", "__entry.js"),
      "const userMod = await import('./server.js');\nexport default userMod.default;\n",
    );
    writeFileSync(
      path.join(root, "dist", "assets", "view-abc.js"),
      "/* bundled view */\n",
    );

    await emitVercelBuildOutput(root);

    const outputDir = path.join(root, ".vercel", "output");
    const funcDir = path.join(outputDir, "functions", "mcp.func");

    expect(existsSync(path.join(funcDir, "index.js"))).toBe(true);
    expect(
      JSON.parse(readFileSync(path.join(funcDir, ".vc-config.json"), "utf-8")),
    ).toEqual(VERCEL_VC_CONFIG);
    expect(
      JSON.parse(readFileSync(path.join(funcDir, "package.json"), "utf-8")),
    ).toEqual({ type: "module" });
    expect(
      JSON.parse(readFileSync(path.join(outputDir, "config.json"), "utf-8")),
    ).toEqual(VERCEL_CONFIG);
    expect(
      readFileSync(
        path.join(outputDir, "static", "assets", "view-abc.js"),
        "utf-8",
      ),
    ).toContain("bundled view");
  });
});
