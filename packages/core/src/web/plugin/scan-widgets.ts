import { globSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, parse, resolve } from "node:path";
import { hasDefaultExport } from "./validate-widget.js";

export interface DiscoveredWidget {
  name: string;
  filePath: string;
}

export function discoverWidgetsSync(widgetsDir: string): DiscoveredWidget[] {
  const flatPattern = resolve(widgetsDir, "*.{tsx,jsx}");
  const dirPattern = resolve(widgetsDir, "*/index.{tsx,jsx}");

  const flatFiles = globSync(flatPattern).map((file) => ({
    name: parse(file).name,
    filePath: file,
  }));

  const dirFiles = globSync(dirPattern).map((file) => ({
    name: basename(dirname(file)),
    filePath: file,
  }));

  // Filter first, then check duplicates — so a barrel file like
  // `views/foo/index.tsx` (no default export) doesn't falsely collide with
  // a sibling widget at `views/foo.tsx`.
  const widgets = [...flatFiles, ...dirFiles]
    .filter((w) => w.name !== "index")
    .filter((w) =>
      hasDefaultExport(readFileSync(w.filePath, "utf-8"), w.filePath),
    );

  const nameMap = new Map<string, string[]>();
  for (const widget of widgets) {
    const paths = nameMap.get(widget.name) ?? [];
    paths.push(widget.filePath);
    nameMap.set(widget.name, paths);
  }

  for (const [name, paths] of nameMap) {
    if (paths.length > 1) {
      throw new Error(
        `skybridge: duplicate widget name "${name}" resolved from:\n  - ${paths.join("\n  - ")}\nRename one of the files to avoid the conflict.`,
      );
    }
  }

  return widgets;
}

export function generateWidgetsDts(widgets: DiscoveredWidget[]): string {
  const entries = widgets.map((w) => `    "${w.name}": true;`).join("\n");
  return [
    "export {};",
    "",
    'declare module "skybridge/server" {',
    "  interface WidgetNameRegistry {",
    entries,
    "  }",
    "}",
    "",
  ].join("\n");
}

export function writeWidgetsDts(
  projectRoot: string,
  widgets: DiscoveredWidget[],
): void {
  const dir = join(projectRoot, ".skybridge");
  mkdirSync(dir, { recursive: true });

  const filePath = join(dir, "widgets.d.ts");
  const content = generateWidgetsDts(widgets);

  try {
    const existing = readFileSync(filePath, "utf-8");
    if (existing === content) {
      return;
    }
  } catch {
    // File doesn't exist yet
  }

  writeFileSync(filePath, content, "utf-8");
}

export function scanAndWriteWidgetsDts(
  projectRoot?: string,
  widgetsDir?: string,
): void {
  const root = projectRoot ?? process.cwd();
  const rawDir = widgetsDir ?? "src/views";
  const resolvedDir = isAbsolute(rawDir) ? rawDir : resolve(root, rawDir);

  const widgets = discoverWidgetsSync(resolvedDir);
  writeWidgetsDts(root, widgets);
}
