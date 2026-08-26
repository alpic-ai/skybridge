import { isAbsolute, relative, resolve } from "node:path";
import {
  assertUniqueViewNames,
  type DiscoveredView,
  discoverViewsSync,
  hasDefaultExport,
  scanViewsSync,
  writeViewsDts,
} from "skybridge/views";
import type { Plugin, UserConfig, ViteDevServer } from "vite";
import { transform as dataLlmTransform } from "./transform-data-llm.js";

const VIRTUAL_PREFIX = "/_skybridge/view/";
const VIRTUAL_MODULE_PREFIX = "\0skybridge:view:";

/** Options for the {@link skybridge} Vite plugin. */
export interface SkybridgePluginOptions {
  /** Directory scanned for view modules. Defaults to `"src/views"`. */
  viewsDir?: string;
  /**
   * Package names to leave unbundled when `skybridge build` bundles the server
   * for deployment. Use it for dependencies esbuild can't resolve or load —
   * typically optional native modules pulled in by a transitive dependency.
   */
  serverExternal?: string[];
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

/**
 * Vite plugin that wires a Skybridge project's view files into Vite.
 *
 * For each `.tsx` / `.jsx` file in `viewsDir` with a default export, the
 * plugin:
 * - exposes a virtual entry that calls {@link mountView} with the view's
 *   default export,
 * - generates `.skybridge/views.d.ts` to augment {@link ViewNameRegistry} so
 *   {@link ViewName} narrows to the actual view names,
 * - rewrites `<DataLLM>` JSX so the host can extract its content,
 * - warns in dev if a view file is missing a default export.
 *
 * Add it to your `vite.config.ts` alongside `@vitejs/plugin-react`.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from "vite";
 * import react from "@vitejs/plugin-react";
 * import { skybridge } from "@skybridge/vite-plugin";
 *
 * export default defineConfig({
 *   plugins: [react(), skybridge({ viewsDir: "src/views" })],
 * });
 * ```
 */
export function skybridge(options?: SkybridgePluginOptions): Plugin {
  return viewsPlugin(options);
}

function viewsPlugin(options?: SkybridgePluginOptions): Plugin {
  const rawViewsDir = options?.viewsDir ?? "src/views";
  let resolvedViewsDir: string;
  let projectRoot: string;
  let viewMap = new Map<string, DiscoveredView>();
  let viewEntryPattern: RegExp;

  return {
    name: "skybridge",
    enforce: "pre",
    // Read by `skybridge build` to resolve viewsDir before `tsc -b` runs, and
    // to feed esbuild's external list when bundling the server.
    api: { viewsDir: rawViewsDir, serverExternal: options?.serverExternal },

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

      const base: UserConfig = {
        base: "/assets",
        // Fixes "Invalid hook call" on createStore by forcing a single
        // copy of React. Under pnpm's isolated node_modules, zustand
        // inside `skybridge` resolves React from skybridge's own
        // dependencies while the host app loads its own copy
        resolve: {
          dedupe: ["react", "react-dom"],
        },
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
          include: ["react", "react-dom/client", "react/jsx-runtime"],
        },
        experimental: {
          renderBuiltUrl: (filename, { hostType }) => {
            // Views render inside a host sandbox iframe, so `import.meta.url`
            // points at the sandbox domain rather than the Skybridge server.
            // JS asset references have to be resolved at runtime against
            // `window.skybridge.serverUrl` so they follow tunnels too.
            if (hostType === "js") {
              return {
                runtime: `window.skybridge.serverUrl + "/assets/${filename}"`,
              };
            }
            // CSS has nowhere to evaluate a runtime expression — `vite:css-post`
            // throws on one. It doesn't need it either: the stylesheet is served
            // from `${serverUrl}/assets/…` and a relative `url()` resolves
            // against the stylesheet's own URL, tunnel origin included.
            return { relative: true };
          },
        },
      };

      return base;
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
      if (viewEntryPattern?.test(id) && !hasDefaultExport(code)) {
        this.warn(
          `View file "${id.split("/").pop()}" is missing a default export.`,
        );
      }

      return await dataLlmTransform(code, id);
    },
  };
}
