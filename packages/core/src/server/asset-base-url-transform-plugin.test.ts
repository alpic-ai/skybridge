import { describe, expect, it } from "vitest";
import { assetBaseUrlTransform } from "./asset-base-url-transform-plugin.js";

describe("assetBaseUrlTransform", () => {
  const devServerOrigin = "http://localhost:3000";

  it("should transform asset paths in single, double, and backtick quotes", () => {
    const cases = [
      {
        desc: "single-quoted",
        code: `const image = '/assets/logo.png';`,
        expected: `const image = '${devServerOrigin}/assets/logo.png';`,
      },
      {
        desc: "double-quoted",
        code: `const image = "/assets/logo.png";`,
        expected: `const image = "${devServerOrigin}/assets/logo.png";`,
      },
      {
        desc: "backtick-quoted",
        code: "const image = `/assets/logo.png`;",
        expected: `const image = \`${devServerOrigin}/assets/logo.png\`;`,
      },
    ];

    for (const { code, expected } of cases) {
      const result = assetBaseUrlTransform(code, devServerOrigin);
      expect(result).toBe(expected);
    }
  });

  it("should transform multiple asset paths", () => {
    const code = `
      const logo = '/assets/logo.png';
      const icon = '/assets/icon.svg';
      const font = '/assets/font.woff2';
    `;
    const result = assetBaseUrlTransform(code, devServerOrigin);

    expect(result).toContain(`${devServerOrigin}/assets/logo.png`);
    expect(result).toContain(`${devServerOrigin}/assets/icon.svg`);
    expect(result).toContain(`${devServerOrigin}/assets/font.woff2`);
  });

  it("should not transform already absolute URLs", () => {
    const code = `
      const local = '/assets/logo.png';
      const http = 'http://example.com/image.png';
      const https = 'https://example.com/image.png';
    `;
    const result = assetBaseUrlTransform(code, devServerOrigin);

    expect(result).toContain(`${devServerOrigin}/assets/logo.png`);
    expect(result).toContain("http://example.com/image.png");
    expect(result).toContain("https://example.com/image.png");
  });

  it("should not transform code without asset paths", () => {
    const code = `const text = "Hello World";`;
    const result = assetBaseUrlTransform(code, devServerOrigin);

    expect(result).toBe(code);
  });
});
