import { rmSync, writeFileSync } from "node:fs";
import path, { isAbsolute, resolve } from "node:path";
import {
  scanAndWriteViewsDts,
  scanViewsSync,
} from "../web/plugin/scan-views.js";
import {
  emitEmptyManifestModule,
  emitEntryWrapper,
  emitManifestModule,
  emitSkillsModule,
  emitVercelBuildOutput,
  ensureAssetsDir,
} from "./build-helpers.js";
import { resolveViewsDir } from "./resolve-views-dir.js";
import type { CommandStep } from "./use-execute-steps.js";

export async function getCommandSteps(
  root = process.cwd(),
): Promise<CommandStep[]> {
  const viewsDir = await resolveViewsDir(root);
  const rawDir = viewsDir ?? "src/views";
  const resolvedDir = isAbsolute(rawDir) ? rawDir : resolve(root, rawDir);
  // Non-throwing pre-check: duplicate view names are validated in the
  // "Scanning views" step so useExecuteSteps can render a styled error.
  const hasViews = scanViewsSync(resolvedDir).valid.length > 0;

  const steps: CommandStep[] = [
    {
      label: "Scanning views",
      run: async () => {
        scanAndWriteViewsDts(root, viewsDir);
      },
    },
    {
      label: "Compiling server",
      run: () =>
        rmSync(path.join(root, "dist"), { recursive: true, force: true }),
      command: "tsc -b --force",
    },
  ];

  if (hasViews) {
    steps.push({
      label: "Building views",
      command: "vite build",
    });
  }

  steps.push(
    {
      label: "Emitting manifest module",
      run: () => {
        const manifestOut = path.join(root, "dist", "vite-manifest.js");
        if (hasViews) {
          emitManifestModule(
            path.join(root, "dist", "assets", ".vite", "manifest.json"),
            manifestOut,
          );
        } else {
          emitEmptyManifestModule(manifestOut);
        }
      },
    },
    {
      label: "Emitting skills module",
      run: () => {
        emitSkillsModule(
          resolve(root, "src/skills"),
          path.join(root, "dist", "skills.js"),
        );
      },
    },
    {
      label: "Emitting entry wrapper",
      run: () => {
        emitEntryWrapper(path.join(root, "dist"));
      },
    },
    {
      label: "Emitting Cloudflare redirects",
      run: () => {
        const assetsDir = path.join(root, "dist", "assets");
        ensureAssetsDir(assetsDir);
        writeFileSync(
          path.join(assetsDir, "_redirects"),
          "/assets/assets/* /assets/:splat 200\n",
        );
      },
    },
    {
      label: "Emitting Cloudflare headers",
      run: () => {
        const assetsDir = path.join(root, "dist", "assets");
        ensureAssetsDir(assetsDir);
        writeFileSync(
          path.join(assetsDir, "_headers"),
          "/assets/*\n  Access-Control-Allow-Origin: *\n",
        );
      },
    },
    {
      label: "Emitting Vercel build output",
      run: () => emitVercelBuildOutput(root),
    },
  );

  return steps;
}
