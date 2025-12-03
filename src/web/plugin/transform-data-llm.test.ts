import { describe, expect, it } from "vitest";
import { transform } from "./transform-data-llm.js";

describe("data-llm plugin", () => {
  it("should transform JSX element with data-llm string attribute", async () => {
    const code = `
      function Component() {
        return <div data-llm="Test description">Content</div>;
      }
    `;

    const result = await transform(code, "test.tsx");

    expect(result).not.toBeNull();
    expect(result?.code).toContain("DataLLM");
    expect(result?.code).toContain('content="Test description"');
    expect(result?.code).not.toContain("data-llm");
  });

  it("should transform JSX element with data-llm expression attribute", async () => {
    const code = `
      function Component() {
        const desc = "Dynamic description";
        return <div data-llm={desc}>Content</div>;
      }
    `;

    const result = await transform(code, "test.tsx");

    expect(result).not.toBeNull();
    expect(result?.code).toContain("DataLLM");
    expect(result?.code).toContain("content={desc}");
    expect(result?.code).not.toContain("data-llm");
  });

  it("should add import for DataLLM when not present", async () => {
    const code = `
      function Component() {
        return <div data-llm="Test">Content</div>;
      }
    `;

    const result = await transform(code, "test.tsx");

    expect(result).not.toBeNull();
    expect(result?.code).toContain('import { DataLLM } from "skybridge/web"');
  });

  it("should handle DataLLM imports correctly", async () => {
    // No duplicate import
    const codeWithImport = `
      import { DataLLM } from "skybridge/web";
      function Component() {
        return <div data-llm="Test">Content</div>;
      }
    `;
    const result1 = await transform(codeWithImport, "test.tsx");
    expect(
      result1?.code.match(/import.*DataLLM.*from.*skybridge\/web/g)
    ).toHaveLength(1);

    // Preserve other imports and add missing DataLLM
    const codeWithOthers = `
      import React from "react";
      import { useState } from "react";
      function Component() {
        return <div data-llm="Test">Content</div>;
      }
    `;
    const result2 = await transform(codeWithOthers, "test.tsx");
    expect(result2?.code).toContain('import React from "react"');
    expect(result2?.code).toContain('import { useState } from "react"');
    expect(result2?.code).toContain('import { DataLLM } from "skybridge/web"');
  });

  it("should handle complex JSX with multiple data-llm attributes", async () => {
    const code = `
      function Component() {
        return (
          <div>
            <section data-llm="Section 1">
              <p>Content 1</p>
            </section>
            <section data-llm="Section 2">
              <p>Content 2</p>
            </section>
          </div>
        );
      }
    `;

    const result = await transform(code, "test.tsx");

    expect(result).toMatchSnapshot();
  });
});
