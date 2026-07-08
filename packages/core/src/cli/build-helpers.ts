import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { discoverSkills } from "../server/skills.js";

// Primes the manifest and skills snapshot in skybridge's module scope, then
// dynamically imports `./server.js` so user code runs *after* the side channels
// are set. The dynamic import is load-bearing: a static
// `export { default } from ...` is hoisted with the rest of the static graph
// and would evaluate `server.js` before the primers run.
//
// `skills.js` is imported (not read from disk at runtime) so skills ride the
// bundle on filesystem-less targets (Cloudflare Workers) and bundled functions
// (Vercel), exactly like the Vite manifest.
export const ENTRY_WRAPPER_CONTENT = `import { __setBuildManifest, __setSkillsManifest } from "skybridge/server";
import manifest from "./vite-manifest.js";
import skills from "./skills.js";

__setBuildManifest(manifest);
__setSkillsManifest(skills);

const userMod = await import("./server.js");
export default userMod.default;
`;

export function emitEntryWrapper(distDir: string): void {
  writeFileSync(path.join(distDir, "__entry.js"), ENTRY_WRAPPER_CONTENT);
}

/**
 * Emit the skills snapshot as a JS module (`export default [...]`). Scans
 * `skillsDir` and inlines each skill's frontmatter, files, and digest, so the
 * runtime never reads skills from disk. Emits an empty array when the directory
 * is absent. Throws (failing the build) on any invalid skill.
 */
export function emitSkillsModule(skillsDir: string, outPath: string): void {
  const skills = existsSync(skillsDir) ? discoverSkills(skillsDir) : [];
  writeFileSync(outPath, `export default ${JSON.stringify(skills)};\n`);
}

export function emitManifestModule(
  manifestPath: string,
  outPath: string,
): void {
  const manifest = readFileSync(manifestPath, "utf-8");
  writeFileSync(outPath, `export default ${manifest};\n`);
}

/** Emit an empty Vite manifest for view-less (headless) servers. */
export function emitEmptyManifestModule(outPath: string): void {
  writeFileSync(outPath, "export default {};\n");
}

export function ensureAssetsDir(assetsDir: string): void {
  mkdirSync(assetsDir, { recursive: true });
}

export const VERCEL_FUNCTION_NAME = "mcp";

export const VERCEL_CONFIG: unknown = {
  version: 3,
  routes: [
    {
      src: "/assets/(.*)",
      headers: { "Access-Control-Allow-Origin": "*" },
      continue: true,
    },
    { handle: "filesystem" },
    { src: "/(.*)", dest: `/${VERCEL_FUNCTION_NAME}` },
  ],
};

export const VERCEL_VC_CONFIG: unknown = {
  runtime: "nodejs22.x",
  handler: "index.js",
  launcherType: "Nodejs",
  shouldAddHelpers: true,
};

// Emit a Build Output API tree under `.vercel/output/`. Bundling the server
// with esbuild produces a self-contained function bundle, so we don't ship
// `node_modules` and don't touch tracked paths like `api/` or `public/`.
//
// Entry is `dist/__entry.js` — the wrapper that primes the Vite manifest via
// `__setBuildManifest` before importing user code. Bundling `dist/server.js`
// directly would skip that priming and 500 on view resource reads when the
// function falls back to `readFileSync('dist/assets/.vite/manifest.json')`
// (Vercel functions don't ship `dist/`).
export async function emitVercelBuildOutput(root: string): Promise<void> {
  const outputDir = path.join(root, ".vercel", "output");
  const funcDir = path.join(
    outputDir,
    "functions",
    `${VERCEL_FUNCTION_NAME}.func`,
  );
  const staticAssetsDir = path.join(outputDir, "static", "assets");

  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(funcDir, { recursive: true });

  const { build } = await import("esbuild");
  await build({
    entryPoints: [path.join(root, "dist", "__entry.js")],
    bundle: true,
    platform: "node",
    target: "node22",
    format: "esm",
    outfile: path.join(funcDir, "index.js"),
    // Lets esbuild DCE dev-only branches that pull in vite/devtools.
    define: { "process.env.NODE_ENV": '"production"' },
    // Dev-only deps reachable from re-exports; safe to leave unresolved since
    // the code paths that touch them are eliminated by the NODE_ENV define.
    external: ["vite", "@skybridge/devtools"],
    banner: {
      // ESM bundles miss CJS interop globals that some deps reach for.
      js: "import{createRequire}from'node:module';const require=createRequire(import.meta.url);",
    },
  });

  writeFileSync(
    path.join(funcDir, ".vc-config.json"),
    `${JSON.stringify(VERCEL_VC_CONFIG, null, 2)}\n`,
  );
  writeFileSync(
    path.join(funcDir, "package.json"),
    `${JSON.stringify({ type: "module" }, null, 2)}\n`,
  );

  const assetsSrc = path.join(root, "dist", "assets");
  if (existsSync(assetsSrc)) {
    cpSync(assetsSrc, staticAssetsDir, { recursive: true });
  } else {
    mkdirSync(staticAssetsDir, { recursive: true });
  }

  writeFileSync(
    path.join(outputDir, "config.json"),
    `${JSON.stringify(VERCEL_CONFIG, null, 2)}\n`,
  );
}
