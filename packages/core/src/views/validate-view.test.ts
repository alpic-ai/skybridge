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
});
