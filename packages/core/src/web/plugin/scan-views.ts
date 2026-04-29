import { globSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, parse, resolve } from "node:path";
import { hasDefaultExport } from "./validate-view.js";

export interface DiscoveredView {
  name: string;
  filePath: string;
}

export interface InvalidView {
  filePath: string;
}

export function scanViewsSync(viewsDir: string): {
  valid: DiscoveredView[];
  invalid: InvalidView[];
} {
  const flatPattern = resolve(viewsDir, "*.{tsx,jsx}");
  const dirPattern = resolve(viewsDir, "*/index.{tsx,jsx}");

  const flatFiles = globSync(flatPattern).map((file) => ({
    name: parse(file).name,
    filePath: file,
  }));

  const dirFiles = globSync(dirPattern).map((file) => ({
    name: basename(dirname(file)),
    filePath: file,
  }));

  // A barrel file like `views/foo/index.tsx` (no default export) must not
  // falsely collide with a sibling `views/foo.tsx`. Drop top-level `index`
  // before splitting valid vs invalid.
  const candidates = [...flatFiles, ...dirFiles].filter(
    (v) => v.name !== "index",
  );

  const valid: DiscoveredView[] = [];
  const invalid: InvalidView[] = [];
  for (const candidate of candidates) {
    const code = readFileSync(candidate.filePath, "utf-8");
    if (hasDefaultExport(code, candidate.filePath)) {
      valid.push(candidate);
    } else {
      invalid.push({
        filePath: candidate.filePath,
      });
    }
  }

  return { valid, invalid };
}

export function discoverViewsSync(viewsDir: string): DiscoveredView[] {
  const { valid } = scanViewsSync(viewsDir);

  const nameMap = new Map<string, string[]>();
  for (const view of valid) {
    const paths = nameMap.get(view.name) ?? [];
    paths.push(view.filePath);
    nameMap.set(view.name, paths);
  }

  for (const [name, paths] of nameMap) {
    if (paths.length > 1) {
      throw new Error(
        `skybridge: duplicate view name "${name}" resolved from:\n  - ${paths.join("\n  - ")}\nRename one of the files to avoid the conflict.`,
      );
    }
  }

  return valid;
}

export function generateViewsDts(views: DiscoveredView[]): string {
  const entries = views.map((v) => `    "${v.name}": true;`).join("\n");
  return [
    "export {};",
    "",
    'declare module "skybridge/server" {',
    "  interface ViewNameRegistry {",
    entries,
    "  }",
    "}",
    "",
  ].join("\n");
}

export function writeViewsDts(
  projectRoot: string,
  views: DiscoveredView[],
): void {
  const dir = join(projectRoot, ".skybridge");
  mkdirSync(dir, { recursive: true });

  const filePath = join(dir, "views.d.ts");
  const content = generateViewsDts(views);

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

export function scanAndWriteViewsDts(
  projectRoot?: string,
  viewsDir?: string,
): void {
  const root = projectRoot ?? process.cwd();
  const rawDir = viewsDir ?? "src/views";
  const resolvedDir = isAbsolute(rawDir) ? rawDir : resolve(root, rawDir);

  const views = discoverViewsSync(resolvedDir);
  writeViewsDts(root, views);
}
