import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

export function emitManifestModule(
  manifestPath: string,
  outPath: string,
): void {
  const manifest = readFileSync(manifestPath, "utf-8");
  writeFileSync(outPath, `export default ${manifest};\n`);
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
    entryPoints: [path.join(root, "dist", "server.js")],
    bundle: true,
    platform: "node",
    target: "node22",
    format: "esm",
    outfile: path.join(funcDir, "index.js"),
    // Lets esbuild DCE dev-only branches that pull in vite/devtools.
    define: { "process.env.NODE_ENV": '"production"' },
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

  cpSync(path.join(root, "dist", "assets"), staticAssetsDir, {
    recursive: true,
  });

  writeFileSync(
    path.join(outputDir, "config.json"),
    `${JSON.stringify(VERCEL_CONFIG, null, 2)}\n`,
  );
}
