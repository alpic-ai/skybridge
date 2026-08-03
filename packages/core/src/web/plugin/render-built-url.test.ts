import { describe, expect, it } from "vitest";
import { renderBuiltAssetUrl } from "./render-built-url.js";

describe("renderBuiltAssetUrl", () => {
  it("resolves JS asset URLs at runtime so they follow the server origin", () => {
    expect(renderBuiltAssetUrl("assets/logo.png", "js")).toEqual({
      runtime: 'window.skybridge.serverUrl + "/assets/assets/logo.png"',
    });
  });

  it("falls back to relative URLs outside JS, where Vite can't evaluate a runtime expression", () => {
    expect(renderBuiltAssetUrl("assets/logo.png", "css")).toEqual({
      relative: true,
    });
    expect(renderBuiltAssetUrl("assets/logo.png", "html")).toEqual({
      relative: true,
    });
  });
});
