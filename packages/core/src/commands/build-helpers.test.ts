import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_VERCEL_JSON,
  emitManifestModule,
  emitVercelFunction,
  ensureVercelJson,
  inspectVercelJson,
  VERCEL_API_ENTRY_CONTENT,
} from "./build-helpers.js";

function mkTmp(prefix = "skybridge-build-helpers-") {
  return mkdtempSync(path.join(tmpdir(), prefix));
}

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

describe("VERCEL_API_ENTRY_CONTENT", () => {
  it("re-exports the default export from dist/server.js", () => {
    expect(VERCEL_API_ENTRY_CONTENT).toBe(
      'export { default } from "../dist/server.js";\n',
    );
  });
});

describe("emitVercelFunction", () => {
  it("writes api/mcp.js pointing at dist/server.js", () => {
    const dir = mkTmp();
    emitVercelFunction(dir);
    const out = readFileSync(path.join(dir, "api", "mcp.js"), "utf-8");
    expect(out).toBe(VERCEL_API_ENTRY_CONTENT);
  });
});

describe("inspectVercelJson", () => {
  it("returns no warnings for the canonical config", () => {
    expect(inspectVercelJson(DEFAULT_VERCEL_JSON)).toEqual([]);
  });

  it("warns when outputDirectory is missing", () => {
    const { outputDirectory: _omit, ...rest } = DEFAULT_VERCEL_JSON;
    const warnings = inspectVercelJson(rest);
    expect(warnings.some((w) => w.includes("outputDirectory"))).toBe(true);
  });

  it("warns when outputDirectory is wrong", () => {
    const warnings = inspectVercelJson({
      ...DEFAULT_VERCEL_JSON,
      outputDirectory: "dist",
    });
    expect(warnings.some((w) => w.includes("outputDirectory"))).toBe(true);
  });

  it("warns when the /api/mcp rewrite is missing", () => {
    const warnings = inspectVercelJson({
      ...DEFAULT_VERCEL_JSON,
      rewrites: [{ source: "/(.*)", destination: "/api/other" }],
    });
    expect(warnings.some((w) => w.includes("/api/mcp"))).toBe(true);
  });

  it("warns when CORS on /assets/(.*) is missing", () => {
    const warnings = inspectVercelJson({
      ...DEFAULT_VERCEL_JSON,
      headers: [],
    });
    expect(
      warnings.some((w) => w.includes("Access-Control-Allow-Origin")),
    ).toBe(true);
  });

  it("warns when the input is not an object", () => {
    expect(inspectVercelJson("nope").length).toBeGreaterThan(0);
    expect(inspectVercelJson(null).length).toBeGreaterThan(0);
  });
});

describe("ensureVercelJson", () => {
  it("writes a default vercel.json when none exists", () => {
    const dir = mkTmp();
    const { written, warnings } = ensureVercelJson(dir);
    expect(written).toBe(true);
    expect(warnings).toEqual([]);
    expect(existsSync(path.join(dir, "vercel.json"))).toBe(true);
    const onDisk = JSON.parse(
      readFileSync(path.join(dir, "vercel.json"), "utf-8"),
    );
    expect(onDisk).toEqual(DEFAULT_VERCEL_JSON);
  });

  it("does not overwrite an existing vercel.json; returns inspection warnings", () => {
    const dir = mkTmp();
    const existing = { outputDirectory: "dist" };
    writeFileSync(
      path.join(dir, "vercel.json"),
      JSON.stringify(existing, null, 2),
    );
    const { written, warnings } = ensureVercelJson(dir);
    expect(written).toBe(false);
    expect(warnings.length).toBeGreaterThan(0);
    const onDisk = JSON.parse(
      readFileSync(path.join(dir, "vercel.json"), "utf-8"),
    );
    expect(onDisk).toEqual(existing);
  });
});
