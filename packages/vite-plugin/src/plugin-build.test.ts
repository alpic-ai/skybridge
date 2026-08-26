// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "vite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { skybridge } from "./plugin.js";

/**
 * Full `vite build` over a fixture whose stylesheet contains a `url()`. The
 * unit test pins the `renderBuiltUrl` contract; this one proves Vite actually
 * accepts what the plugin returns.
 */
describe("skybridge plugin build", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "skybridge-build-"));
    mkdirSync(join(root, "views"), { recursive: true });
    mkdirSync(join(root, "src"), { recursive: true });

    writeFileSync(join(root, "src/demo.woff2"), Buffer.alloc(64, 1));
    writeFileSync(
      join(root, "src/styles.css"),
      [
        "@font-face {",
        '  font-family: "Demo";',
        '  src: url("./demo.woff2") format("woff2");',
        "}",
      ].join("\n"),
    );
    writeFileSync(join(root, "src/entry.js"), `import "./styles.css";\n`);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("builds a view stylesheet that references a font", async () => {
    const result = await build({
      root,
      logLevel: "silent",
      plugins: [skybridge({ viewsDir: join(root, "views") })],
      build: {
        // Force the font to be emitted as a file rather than inlined, so the
        // stylesheet actually carries a `url()`.
        assetsInlineLimit: 0,
        rollupOptions: { input: { entry: join(root, "src/entry.js") } },
      },
    });

    const outputs = (Array.isArray(result) ? result : [result]).flatMap(
      (bundle) => ("output" in bundle ? bundle.output : []),
    );
    const css = outputs.find(
      (chunk) => chunk.type === "asset" && chunk.fileName.endsWith(".css"),
    );
    if (css?.type !== "asset") {
      throw new Error("no CSS asset was emitted");
    }

    // The font resolves relative to the stylesheet, which the server hands out
    // from `${serverUrl}/assets/` — no runtime expression, which CSS can't run.
    expect(String(css.source)).toMatch(/url\(\.\/demo-[\w-]+\.woff2\)/);
    expect(String(css.source)).not.toContain("window.skybridge");
  });
});
