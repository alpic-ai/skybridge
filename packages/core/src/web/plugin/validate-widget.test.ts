import { describe, expect, it } from "vitest";
import { validateWidget } from "./validate-widget.js";

describe("validateWidget", () => {
  it("returns no warnings for a valid widget", () => {
    expect(
      validateWidget(
        "export default MyWidget;\nmountWidget(<MyWidget />);",
        "src/widgets/my-widget.tsx",
      ),
    ).toEqual([]);
  });

  it("accepts all default export syntaxes", () => {
    for (const exportLine of [
      "export default MyWidget;",
      "export default function MyWidget() {}",
      "export { Foo as default };",
    ]) {
      expect(
        validateWidget(
          `${exportLine}\nmountWidget(<MyWidget />);`,
          "src/widgets/my-widget.tsx",
        ),
      ).toEqual([]);
    }
  });

  it("warns when export default is missing", () => {
    const warnings = validateWidget(
      "mountWidget(<MyWidget />);",
      "src/widgets/my-widget.tsx",
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.message).toContain("missing a default export");
    expect(warnings[0]?.message).toContain("my-widget.tsx");
  });

  it("warns when mountWidget() call is missing", () => {
    const warnings = validateWidget(
      "export default MyWidget;",
      "src/widgets/my-widget.tsx",
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.message).toContain("missing a mountWidget() call");
    expect(warnings[0]?.message).toContain("my-widget.tsx");
  });

  it("ignores commented-out code", () => {
    const code = `
      // export default MyWidget;
      // mountWidget(<MyWidget />);
      /* export default MyWidget; */
      /* mountWidget(<MyWidget />); */
    `;
    expect(validateWidget(code, "src/widgets/my-widget.tsx")).toHaveLength(2);
  });

  it("uses filename from path for directory widgets", () => {
    const warnings = validateWidget("", "src/widgets/foo/index.tsx");
    expect(warnings[0]?.message).toContain("index.tsx");
  });
});
