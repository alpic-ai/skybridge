import { describe, expect, it } from "vitest";
import { hasDefaultExport } from "./validate-view.js";

describe("hasDefaultExport", () => {
  it("detects export default declaration", () => {
    expect(hasDefaultExport("export default MyView;")).toBe(true);
  });

  it("detects export default function", () => {
    expect(hasDefaultExport("export default function MyView() {}")).toBe(true);
  });

  it("detects re-export as default", () => {
    expect(hasDefaultExport("export { Foo as default };")).toBe(true);
  });

  it("returns false when no default export", () => {
    expect(hasDefaultExport("export const Foo = 1;")).toBe(false);
  });

  it("ignores commented-out default exports", () => {
    const code = `
      // export default MyView;
      /* export default MyView; */
    `;
    expect(hasDefaultExport(code)).toBe(false);
  });

  it("keeps a default export after a URL in a one-line block comment", () => {
    const code = `
      /** See https://example.com/docs */
      export default function MyView() {}
      /** Helper */
      export const Foo = 1;
    `;
    expect(hasDefaultExport(code)).toBe(true);
  });

  it("keeps a default export after // inside a string", () => {
    expect(hasDefaultExport("const u = 'http://x'; export default V;")).toBe(
      true,
    );
  });

  it("keeps a default export after a string continued with a backslash", () => {
    const code = [
      'const marker = "start \\',
      '/*"; export default function View() { return null; }',
      "// */",
    ].join("\n");
    expect(hasDefaultExport(code)).toBe(true);
  });

  it("keeps a default export after /* inside a regex literal", () => {
    const code = "const re = /[/*]/;\nexport default V;\n// end */\n";
    expect(hasDefaultExport(code)).toBe(true);
  });

  it("ignores a default export that only appears in a block comment with a URL", () => {
    expect(hasDefaultExport("/* http://x */ /* export default V; */")).toBe(
      false,
    );
  });
});
