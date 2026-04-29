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
  discoverViewsSync,
  scanAndWriteViewsDts,
  scanViewsSync,
  writeViewsDts,
} from "./scan-views.js";

const DEFAULT_EXPORT = "export default function V() { return null; }";

describe("discoverViewsSync", () => {
  let root: string;
  let viewsDir: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "skybridge-scan-"));
    viewsDir = join(root, "views");
    mkdirSync(viewsDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("picks up flat and dir-index views", () => {
    writeFileSync(join(viewsDir, "a.tsx"), DEFAULT_EXPORT);
    mkdirSync(join(viewsDir, "my-view"));
    writeFileSync(join(viewsDir, "my-view/index.tsx"), DEFAULT_EXPORT);

    expect(
      discoverViewsSync(viewsDir)
        .map((v) => v.name)
        .sort(),
    ).toEqual(["a", "my-view"]);
  });

  it("throws on duplicate view names (flat + dir-index collision)", () => {
    writeFileSync(join(viewsDir, "dup.tsx"), DEFAULT_EXPORT);
    mkdirSync(join(viewsDir, "dup"));
    writeFileSync(join(viewsDir, "dup/index.tsx"), DEFAULT_EXPORT);

    expect(() => discoverViewsSync(viewsDir)).toThrow(
      /duplicate view name "dup"/,
    );
  });
});

describe("scanViewsSync", () => {
  let root: string;
  let viewsDir: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "skybridge-scan-views-"));
    viewsDir = join(root, "views");
    mkdirSync(viewsDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("returns valid and invalid views from a flat layout", () => {
    writeFileSync(join(viewsDir, "ok.tsx"), DEFAULT_EXPORT);
    writeFileSync(
      join(viewsDir, "broken.tsx"),
      "export const Foo = () => null;",
    );

    const { valid, invalid } = scanViewsSync(viewsDir);

    expect(valid.map((v) => v.name).sort()).toEqual(["ok"]);
    expect(invalid).toEqual([{ filePath: join(viewsDir, "broken.tsx") }]);
  });

  it("flags an index file in a view dir that lacks a default export", () => {
    mkdirSync(join(viewsDir, "broken"));
    writeFileSync(
      join(viewsDir, "broken/index.tsx"),
      "export const Foo = () => null;",
    );

    const { valid, invalid } = scanViewsSync(viewsDir);

    expect(valid).toEqual([]);
    expect(invalid).toEqual([{ filePath: join(viewsDir, "broken/index.tsx") }]);
  });

  it("ignores top-level index.tsx (treated as a barrel, not a view)", () => {
    writeFileSync(
      join(viewsDir, "index.tsx"),
      "export const Foo = () => null;",
    );

    const { valid, invalid } = scanViewsSync(viewsDir);

    expect(valid).toEqual([]);
    expect(invalid).toEqual([]);
  });
});

describe("writeViewsDts", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "skybridge-dts-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("is a no-op when content is unchanged", () => {
    const views = [{ name: "a", filePath: "/a.tsx" }];
    writeViewsDts(root, views);

    const dtsPath = join(root, ".skybridge", "views.d.ts");
    const firstMtime = statSync(dtsPath).mtimeMs;

    writeViewsDts(root, views);
    expect(statSync(dtsPath).mtimeMs).toBe(firstMtime);
  });
});

describe("scanAndWriteViewsDts", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "skybridge-scan-dts-"));
    mkdirSync(join(root, "src/views"), { recursive: true });
    writeFileSync(join(root, "src/views/hello.tsx"), DEFAULT_EXPORT);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("writes a views.d.ts that augments skybridge/server with discovered view names", () => {
    scanAndWriteViewsDts(root);

    const content = readFileSync(join(root, ".skybridge/views.d.ts"), "utf-8");
    expect(content).toContain('declare module "skybridge/server"');
    expect(content).toContain('"hello": true;');
  });
});
