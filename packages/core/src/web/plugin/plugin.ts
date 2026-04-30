import { isAbsolute, relative, resolve } from "node:path";
import type { Plugin, ViteDevServer } from "vite";
import {
  assertUniqueViewNames,
  type DiscoveredView,
  discoverViewsSync,
  scanViewsSync,
  writeViewsDts,
} from "./scan-views.js";
import { transform as dataLlmTransform } from "./transform-data-llm.js";
import { hasDefaultExport } from "./validate-view.js";

const VIRTUAL_PREFIX = "/_skybridge/view/";
const VIRTUAL_MODULE_PREFIX = "\0skybridge:view:";

export interface SkybridgePluginOptions {
  viewsDir?: string;
}

function buildVirtualEntry(viewFilePath: string): string {
  const normalized = viewFilePath.replace(/\\/g, "/");
  return [
    `import { mountView } from "skybridge/web";`,
    `import Component from "${normalized}";`,
    `import { createElement } from "react";`,
    `mountView(createElement(Component));`,
  ].join("\n");
}

function getViewEntryPattern(viewsDir: string): RegExp {
  const escaped = viewsDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `${escaped}\\/(?:[^/]+\\.(?:jsx|tsx)|[^/]+\\/index\\.(?:tsx|jsx))(?:\\?.*)?$`,
  );
}

export function skybridge(options?: SkybridgePluginOptions): Plugin {
  const rawViewsDir = options?.viewsDir ?? "src/views";
  let resolvedViewsDir: string;
  let projectRoot: string;
  let viewMap = new Map<string, DiscoveredView>();
  let viewEntryPattern: RegExp;

  return {
    name: "skybridge",
    enforce: "pre",
    // Read by `skybridge build` to resolve viewsDir before `tsc -b` runs.
    api: { viewsDir: rawViewsDir },

    config(config) {
      projectRoot = config.root || process.cwd();
      resolvedViewsDir = isAbsolute(rawViewsDir)
        ? rawViewsDir
        : resolve(projectRoot, rawViewsDir);
      viewEntryPattern = getViewEntryPattern(resolvedViewsDir);

      const views = discoverViewsSync(resolvedViewsDir);
      viewMap = new Map(views.map((v) => [v.name, v]));
      writeViewsDts(projectRoot, views);

      const input: Record<string, string> = {};
      for (const view of views) {
        input[view.name] = `${VIRTUAL_PREFIX}${view.name}`;
      }

      return {
        base: "/assets",
        build: {
          outDir: "dist/assets",
          emptyOutDir: true,
          manifest: true,
          minify: true,
          cssCodeSplit: false,
          rollupOptions: {
            input,
          },
        },
        // Pre-bundle view deps at startup so the first tool invocation
        // doesn't hit Vite's on-demand re-optimization path (which sends
        // `full-reload` over HMR — in our iframe flow the parent host
        // can't honour a reload, and the view silently never mounts).
        optimizeDeps: {
          // Scan view files so transitive user deps (zod, tailwind, etc.)
          // get pre-bundled at startup.
          entries: [
            `${resolvedViewsDir}/*.{tsx,jsx}`,
            `${resolvedViewsDir}/*/index.{tsx,jsx}`,
          ],
          // Framework deps imported by the synthesized virtual entry.
          // The scanner can't see the virtual module source, so we must
          // list these explicitly.
          include: [
            "react",
            "react-dom/client",
            "react/jsx-runtime",
            "skybridge/web",
          ],
        },
        experimental: {
          renderBuiltUrl: (filename) => {
            return {
              runtime: `window.skybridge.serverUrl + "/assets/${filename}"`,
            };
          },
        },
      };
    },

    resolveId(id) {
      if (id.startsWith(VIRTUAL_PREFIX)) {
        const name = id.slice(VIRTUAL_PREFIX.length);
        if (viewMap.has(name)) {
          return `${VIRTUAL_MODULE_PREFIX}${name}`;
        }
      }
      return null;
    },

    load(id) {
      if (id.startsWith(VIRTUAL_MODULE_PREFIX)) {
        const name = id.slice(VIRTUAL_MODULE_PREFIX.length);
        const view = viewMap.get(name);
        if (view) {
          return buildVirtualEntry(view.filePath);
        }
      }
      return null;
    },

    configureServer(server: ViteDevServer) {
      if (!resolvedViewsDir) {
        const root = server.config.root || process.cwd();
        resolvedViewsDir = isAbsolute(rawViewsDir)
          ? rawViewsDir
          : resolve(root, rawViewsDir);
        projectRoot = root;
        viewEntryPattern = getViewEntryPattern(resolvedViewsDir);
      }

      server.watcher.add(resolvedViewsDir);
      // Track which view files we've already warned about so a rescan
      // triggered by an unrelated edit doesn't re-emit the same warning.
      let knownInvalid = new Set<string>();
      const rescan = () => {
        try {
          // Surface broken view files. Without this, files lacking a
          // default export are silently dropped from the input and the
          // user has no idea why their widget never mounts.
          const { valid, invalid } = scanViewsSync(resolvedViewsDir);
          const nextInvalid = new Set(invalid.map((v) => v.filePath));

          for (const filePath of nextInvalid) {
            if (!knownInvalid.has(filePath)) {
              server.config.logger.warn(
                `[skybridge] view file "${relative(projectRoot, filePath)}" is missing a default export — it won't be served until fixed.`,
              );
            }
          }
          for (const filePath of knownInvalid) {
            if (!nextInvalid.has(filePath)) {
              server.config.logger.info(
                `[skybridge] view file "${relative(projectRoot, filePath)}" resolved.`,
              );
            }
          }
          knownInvalid = nextInvalid;

          assertUniqueViewNames(valid);
          viewMap = new Map(valid.map((v) => [v.name, v]));
          writeViewsDts(projectRoot, valid);
        } catch (err) {
          // assertUniqueViewNames throws on duplicate view names. Catch so
          // chokidar's listener chain doesn't surface it as unhandled and
          // crash the dev server — previous viewMap stays active until
          // the user fixes the conflict.
          const message = err instanceof Error ? err.message : String(err);
          server.config.logger.error(
            `[skybridge] view rescan failed: ${message}`,
          );
        }
      };

      // Initial scan emits warnings for broken files that exist at startup.
      rescan();
      server.watcher.on("add", rescan);
      server.watcher.on("change", rescan);
      server.watcher.on("unlink", rescan);
    },

    async transform(code, id) {
      if (viewEntryPattern?.test(id) && !hasDefaultExport(code, id)) {
        this.warn(
          `View file "${id.split("/").pop()}" is missing a default export.`,
        );
      }

      return await dataLlmTransform(code, id);
    },
  };
}
