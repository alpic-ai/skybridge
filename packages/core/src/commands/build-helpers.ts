import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

export const DEFAULT_VERCEL_JSON = {
  $schema: "https://openapi.vercel.sh/vercel.json",
  // Disable framework auto-detection: Skybridge projects ship a vite.config.ts
  // that Vercel would otherwise pick up as a SPA, running `vite` instead of
  // our serverless function. Filesystem + functions only.
  framework: null,
  // Skip Vercel's install + build — `skybridge build --target vercel` has
  // already produced dist/, public/, and api/. Empty strings fall through
  // to framework defaults; `true` is the unix no-op that satisfies Vercel.
  installCommand: "true",
  buildCommand: "true",
  outputDirectory: "public",
  rewrites: [{ source: "/(.*)", destination: "/api/mcp" }],
  headers: [
    {
      source: "/assets/(.*)",
      headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
    },
  ],
};

export function inspectVercelJson(json: unknown): string[] {
  const warnings: string[] = [];
  if (typeof json !== "object" || json === null) {
    warnings.push("vercel.json is not a JSON object.");
    return warnings;
  }
  const cfg = json as Record<string, unknown>;
  if (cfg.outputDirectory !== "public") {
    warnings.push('vercel.json: missing or wrong `outputDirectory: "public"`.');
  }
  const rewrites = Array.isArray(cfg.rewrites)
    ? (cfg.rewrites as Array<Record<string, unknown>>)
    : [];
  const hasMcpRewrite = rewrites.some(
    (r) => r.destination === "/api/mcp" && typeof r.source === "string",
  );
  if (!hasMcpRewrite) {
    warnings.push(
      "vercel.json: missing a rewrite to `/api/mcp` (needed so all routes hit the MCP function).",
    );
  }
  const headers = Array.isArray(cfg.headers)
    ? (cfg.headers as Array<Record<string, unknown>>)
    : [];
  const assetsCors = headers.some((h) => {
    if (h.source !== "/assets/(.*)") {
      return false;
    }
    const list = Array.isArray(h.headers)
      ? (h.headers as Array<Record<string, unknown>>)
      : [];
    return list.some(
      (entry) =>
        entry.key === "Access-Control-Allow-Origin" && entry.value === "*",
    );
  });
  if (!assetsCors) {
    warnings.push(
      "vercel.json: missing CORS header `Access-Control-Allow-Origin: *` on `/assets/(.*)`.",
    );
  }
  return warnings;
}

export function ensureVercelJson(root: string): {
  written: boolean;
  warnings: string[];
} {
  const target = path.join(root, "vercel.json");
  if (!existsSync(target)) {
    writeFileSync(target, `${JSON.stringify(DEFAULT_VERCEL_JSON, null, 2)}\n`);
    return { written: true, warnings: [] };
  }
  try {
    const parsed = JSON.parse(readFileSync(target, "utf-8"));
    return { written: false, warnings: inspectVercelJson(parsed) };
  } catch (error) {
    return {
      written: false,
      warnings: [`vercel.json: failed to parse (${String(error)}).`],
    };
  }
}
