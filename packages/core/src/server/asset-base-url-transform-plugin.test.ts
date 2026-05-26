import { describe, expect, it } from "vitest";
import {
  assetBaseUrlTransform,
  assetBaseUrlTransformPlugin,
  isCssRequest,
} from "./asset-base-url-transform-plugin.js";

describe("assetBaseUrlTransform", () => {
  it("should transform asset paths to use window.skybridge.serverUrl", () => {
    const cases = [
      {
        desc: "single-quoted",
        code: `const image = '/assets/logo.png';`,
        expected: `const image = (window.skybridge?.serverUrl ?? "") + "/assets/logo.png";`,
      },
      {
        desc: "double-quoted",
        code: `const image = "/assets/logo.png";`,
        expected: `const image = (window.skybridge?.serverUrl ?? "") + "/assets/logo.png";`,
      },
      {
        desc: "backtick-quoted",
        code: "const image = `/assets/logo.png`;",
        expected: `const image = (window.skybridge?.serverUrl ?? "") + "/assets/logo.png";`,
      },
    ];

    for (const { code, expected } of cases) {
      const result = assetBaseUrlTransform(code);
      expect(result).toBe(expected);
    }
  });

  it("should transform multiple asset paths", () => {
    const code = `
      const logo = '/assets/logo.png';
      const icon = '/assets/icon.svg';
      const font = '/assets/font.woff2';
    `;
    const result = assetBaseUrlTransform(code);

    expect(result).toContain(
      `(window.skybridge?.serverUrl ?? "") + "/assets/logo.png"`,
    );
    expect(result).toContain(
      `(window.skybridge?.serverUrl ?? "") + "/assets/icon.svg"`,
    );
    expect(result).toContain(
      `(window.skybridge?.serverUrl ?? "") + "/assets/font.woff2"`,
    );
  });

  it("should not transform already absolute URLs", () => {
    const code = `
      const local = '/assets/logo.png';
      const http = 'http://example.com/image.png';
      const https = 'https://example.com/image.png';
    `;
    const result = assetBaseUrlTransform(code);

    expect(result).toContain(
      `(window.skybridge?.serverUrl ?? "") + "/assets/logo.png"`,
    );
    expect(result).toContain("http://example.com/image.png");
    expect(result).toContain("https://example.com/image.png");
  });

  it("should not transform code without asset paths", () => {
    const code = `const text = "Hello World";`;
    const result = assetBaseUrlTransform(code);

    expect(result).toBe(code);
  });

  it("should not transform asset paths inside static `import ... from` clauses", () => {
    // Reproducer for #713: a dep does `import * as sprite from './icons.svg'`,
    // Vite resolves the relative path to absolute, then this transform used
    // to rewrite the resolved string — producing invalid JS like
    // `import * as sprite from (expr) + "..."` that crashes vite:import-analysis.
    const cases = [
      `import * as sprite from "/Users/me/proj/node_modules/pkg/icons.svg";`,
      `import sprite from '/assets/icons.svg';`,
      `import sprite from "/assets/icons.svg";`,
      `export { default } from "/assets/icons.svg";`,
      `export * from '/assets/sprites.svg';`,
    ];

    for (const code of cases) {
      expect(assetBaseUrlTransform(code)).toBe(code);
    }
  });

  it("should still transform value-position asset paths in files that also have unrelated imports", () => {
    const code = [
      `import { foo } from "./foo.js";`,
      `import * as sprite from "/assets/sprite.svg";`,
      `const logo = "/assets/logo.png";`,
    ].join("\n");
    const result = assetBaseUrlTransform(code);

    // Imports untouched
    expect(result).toContain(`from "./foo.js"`);
    expect(result).toContain(`from "/assets/sprite.svg"`);
    // Value-position rewritten
    expect(result).toContain(
      `const logo = (window.skybridge?.serverUrl ?? "") + "/assets/logo.png";`,
    );
  });
});

describe("isCssRequest", () => {
  it("returns true for CSS-family extensions", () => {
    expect(isCssRequest("/src/styles.css")).toBe(true);
    expect(isCssRequest("/src/styles.module.css")).toBe(true);
    expect(isCssRequest("/src/styles.scss")).toBe(true);
    expect(isCssRequest("/src/styles.sass")).toBe(true);
    expect(isCssRequest("/src/styles.less")).toBe(true);
    expect(isCssRequest("/src/styles.styl")).toBe(true);
  });

  it("returns true for CSS modules with Vite query strings", () => {
    expect(isCssRequest("/src/styles.css?direct")).toBe(true);
    expect(isCssRequest("/src/styles.css?inline")).toBe(true);
    expect(isCssRequest("/src/styles.css?used")).toBe(true);
    expect(isCssRequest("/src/Foo.vue?vue&type=style&lang.css")).toBe(true);
  });

  it("returns false for non-CSS modules", () => {
    expect(isCssRequest("/src/index.tsx")).toBe(false);
    expect(isCssRequest("/src/utils.ts")).toBe(false);
    expect(isCssRequest("/src/Logo.svg")).toBe(false);
    expect(isCssRequest("/src/notes.cssx")).toBe(false);
  });
});

describe("assetBaseUrlTransformPlugin", () => {
  type TransformResult = { code: string; map: null } | null;

  function runTransform(id: string, code: string): TransformResult {
    const plugin = assetBaseUrlTransformPlugin();
    const hook = plugin.transform;
    if (!hook) {
      throw new Error("plugin.transform is not defined");
    }
    const handler = typeof hook === "function" ? hook : hook.handler;
    return handler.call(
      // biome-ignore lint/suspicious/noExplicitAny: vitest harness for plugin hook
      {} as any,
      code,
      id,
      { moduleType: "js" },
    ) as TransformResult;
  }

  it("rewrites asset paths in JS modules", () => {
    const result = runTransform(
      "/src/widget.tsx",
      `const logo = "/assets/logo.png";`,
    );
    expect(result?.code).toContain(
      `(window.skybridge?.serverUrl ?? "") + "/assets/logo.png"`,
    );
  });

  // Reproducer for #697: CSS imports are served as JS modules with the
  // stylesheet embedded as a string. Rewriting url("/foo.woff2") inside that
  // string would produce invalid CSS once the styles are injected.
  it("does not rewrite asset paths when transforming a CSS module", () => {
    const cssCode = `__vite__updateStyle("style-id", "@font-face { src: url(\\"/fonts/Brand.woff2\\") format(\\"woff2\\"); }");`;

    expect(runTransform("/src/fonts.css", cssCode)).toBeNull();
    expect(runTransform("/src/fonts.css?direct", cssCode)).toBeNull();
    expect(runTransform("/src/fonts.css?inline", cssCode)).toBeNull();
    expect(runTransform("/src/styles.scss", cssCode)).toBeNull();
    expect(
      runTransform("/src/Foo.vue?vue&type=style&lang.css", cssCode),
    ).toBeNull();
  });
});
