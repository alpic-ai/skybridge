import { isAbsolute, resolve } from "node:path";
import type { Plugin, ViteDevServer } from "vite";
import {
  type DiscoveredWidget,
  discoverWidgetsSync,
  writeWidgetsDts,
} from "./scan-widgets.js";
import { transform as dataLlmTransform } from "./transform-data-llm.js";
import { hasDefaultExport } from "./validate-widget.js";

const VIRTUAL_PREFIX = "/_skybridge/widget/";
const VIRTUAL_MODULE_PREFIX = "\0skybridge:widget:";

export interface SkybridgePluginOptions {
  widgetsDir?: string;
}

function buildVirtualEntry(widgetFilePath: string): string {
  const normalized = widgetFilePath.replace(/\\/g, "/");
  return [
    `import { mountWidget } from "skybridge/web";`,
    `import Component from "${normalized}";`,
    `import { createElement } from "react";`,
    `mountWidget(createElement(Component));`,
  ].join("\n");
}

function buildWidgetEntryRe(widgetsDir: string): RegExp {
  const escaped = widgetsDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `${escaped}\\/(?:[^/]+\\.(?:jsx|tsx)|[^/]+\\/index\\.(?:tsx|jsx))(?:\\?.*)?$`,
  );
}

export function skybridge(options?: SkybridgePluginOptions): Plugin {
  const rawWidgetsDir = options?.widgetsDir ?? "src/views";
  let resolvedWidgetsDir: string;
  let projectRoot: string;
  let widgetMap = new Map<string, DiscoveredWidget>();
  let widgetEntryRe: RegExp;

  return {
    name: "skybridge",
    enforce: "pre",
    // Read by `skybridge build` to resolve widgetsDir before `tsc -b` runs.
    api: { widgetsDir: rawWidgetsDir },

    config(config) {
      projectRoot = config.root || process.cwd();
      resolvedWidgetsDir = isAbsolute(rawWidgetsDir)
        ? rawWidgetsDir
        : resolve(projectRoot, rawWidgetsDir);
      widgetEntryRe = buildWidgetEntryRe(resolvedWidgetsDir);

      const widgets = discoverWidgetsSync(resolvedWidgetsDir);
      widgetMap = new Map(widgets.map((w) => [w.name, w]));
      writeWidgetsDts(projectRoot, widgets);

      const input: Record<string, string> = {};
      for (const widget of widgets) {
        input[widget.name] = `${VIRTUAL_PREFIX}${widget.name}`;
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
        // Pre-bundle widget deps at startup so the first tool invocation
        // doesn't hit Vite's on-demand re-optimization path (which sends
        // `full-reload` over HMR — in our iframe flow the parent host
        // can't honour a reload, and the widget silently never mounts).
        optimizeDeps: {
          // Scan widget files so transitive user deps (zod, tailwind, etc.)
          // get pre-bundled at startup.
          entries: [
            `${resolvedWidgetsDir}/*.{tsx,jsx}`,
            `${resolvedWidgetsDir}/*/index.{tsx,jsx}`,
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
        if (widgetMap.has(name)) {
          return `${VIRTUAL_MODULE_PREFIX}${name}`;
        }
      }
      return null;
    },

    load(id) {
      if (id.startsWith(VIRTUAL_MODULE_PREFIX)) {
        const name = id.slice(VIRTUAL_MODULE_PREFIX.length);
        const widget = widgetMap.get(name);
        if (widget) {
          return buildVirtualEntry(widget.filePath);
        }
      }
      return null;
    },

    configureServer(server: ViteDevServer) {
      if (!resolvedWidgetsDir) {
        const root = server.config.root || process.cwd();
        resolvedWidgetsDir = isAbsolute(rawWidgetsDir)
          ? rawWidgetsDir
          : resolve(root, rawWidgetsDir);
        projectRoot = root;
        widgetEntryRe = buildWidgetEntryRe(resolvedWidgetsDir);
      }

      server.watcher.add(resolvedWidgetsDir);
      const rescan = () => {
        try {
          const widgets = discoverWidgetsSync(resolvedWidgetsDir);
          widgetMap = new Map(widgets.map((w) => [w.name, w]));
          writeWidgetsDts(projectRoot, widgets);
        } catch (err) {
          // discoverWidgetsSync throws on duplicate widget names. Catch so
          // chokidar's listener chain doesn't surface it as unhandled and
          // crash the dev server — previous widgetMap stays active until
          // the user fixes the conflict.
          const message = err instanceof Error ? err.message : String(err);
          server.config.logger.error(
            `[skybridge] widget rescan failed: ${message}`,
          );
        }
      };

      server.watcher.on("add", rescan);
      server.watcher.on("unlink", rescan);
    },

    async transform(code, id) {
      if (widgetEntryRe?.test(id)) {
        if (!hasDefaultExport(code, id)) {
          this.warn(
            `Widget file "${id.split("/").pop()}" is missing a default export.`,
          );
        }
      }

      return await dataLlmTransform(code, id);
    },
  };
}
