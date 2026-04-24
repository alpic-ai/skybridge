import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  discoverWidgetsSync,
  scanAndWriteWidgetsDts,
  writeWidgetsDts,
} from "./scan-widgets.js";

const DEFAULT_EXPORT = "export default function W() { return null; }";

describe("discoverWidgetsSync", () => {
  let root: string;
  let widgetsDir: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "skybridge-scan-"));
    widgetsDir = join(root, "views");
    mkdirSync(widgetsDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("picks up flat .tsx/.jsx widgets", () => {
    writeFileSync(join(widgetsDir, "a.tsx"), DEFAULT_EXPORT);
    writeFileSync(join(widgetsDir, "b.jsx"), DEFAULT_EXPORT);

    expect(
      discoverWidgetsSync(widgetsDir)
        .map((w) => w.name)
        .sort(),
    ).toEqual(["a", "b"]);
  });

  it("picks up dir-index widgets and names them after the directory", () => {
    mkdirSync(join(widgetsDir, "my-widget"));
    writeFileSync(join(widgetsDir, "my-widget/index.tsx"), DEFAULT_EXPORT);

    expect(discoverWidgetsSync(widgetsDir)).toMatchObject([
      { name: "my-widget" },
    ]);
  });

  it("ignores .ts/.js files and non-index files inside widget directories", () => {
    writeFileSync(join(widgetsDir, "only-ts.ts"), DEFAULT_EXPORT);
    mkdirSync(join(widgetsDir, "mixed"));
    writeFileSync(join(widgetsDir, "mixed/index.tsx"), DEFAULT_EXPORT);
    writeFileSync(join(widgetsDir, "mixed/helper.tsx"), DEFAULT_EXPORT);

    expect(discoverWidgetsSync(widgetsDir).map((w) => w.name)).toEqual([
      "mixed",
    ]);
  });

  it("filters out a top-level index.tsx", () => {
    writeFileSync(join(widgetsDir, "index.tsx"), DEFAULT_EXPORT);
    writeFileSync(join(widgetsDir, "real.tsx"), DEFAULT_EXPORT);

    expect(discoverWidgetsSync(widgetsDir).map((w) => w.name)).toEqual([
      "real",
    ]);
  });

  it("filters out files without a default export", () => {
    writeFileSync(join(widgetsDir, "has-default.tsx"), DEFAULT_EXPORT);
    writeFileSync(join(widgetsDir, "no-default.tsx"), "export const Foo = 1;");

    expect(discoverWidgetsSync(widgetsDir).map((w) => w.name)).toEqual([
      "has-default",
    ]);
  });

  it("throws on duplicate widget names (flat + dir-index collision)", () => {
    writeFileSync(join(widgetsDir, "dup.tsx"), DEFAULT_EXPORT);
    mkdirSync(join(widgetsDir, "dup"));
    writeFileSync(join(widgetsDir, "dup/index.tsx"), DEFAULT_EXPORT);

    expect(() => discoverWidgetsSync(widgetsDir)).toThrow(
      /duplicate widget name "dup"/,
    );
  });

  it("allows a sibling barrel without a default export to co-exist with a flat widget", () => {
    writeFileSync(join(widgetsDir, "foo.tsx"), DEFAULT_EXPORT);
    mkdirSync(join(widgetsDir, "foo"));
    // barrel re-export, no default — should NOT collide with foo.tsx
    writeFileSync(
      join(widgetsDir, "foo/index.tsx"),
      "export { Bar } from './bar.js';",
    );

    expect(discoverWidgetsSync(widgetsDir).map((w) => w.name)).toEqual(["foo"]);
  });
});

describe("writeWidgetsDts", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "skybridge-dts-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("is a no-op when content is unchanged", () => {
    const widgets = [{ name: "a", filePath: "/a.tsx" }];
    writeWidgetsDts(root, widgets);

    const dtsPath = join(root, ".skybridge", "widgets.d.ts");
    const firstMtime = statSync(dtsPath).mtimeMs;

    writeWidgetsDts(root, widgets);
    expect(statSync(dtsPath).mtimeMs).toBe(firstMtime);
  });
});

describe("scanAndWriteWidgetsDts", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "skybridge-scan-dts-"));
    mkdirSync(join(root, "src/views"), { recursive: true });
    writeFileSync(join(root, "src/views/hello.tsx"), DEFAULT_EXPORT);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("writes a widgets.d.ts that augments skybridge/server with discovered widget names", () => {
    scanAndWriteWidgetsDts(root);

    const content = readFileSync(
      join(root, ".skybridge/widgets.d.ts"),
      "utf-8",
    );
    expect(content).toContain('declare module "skybridge/server"');
    expect(content).toContain('"hello": true;');
  });
});
