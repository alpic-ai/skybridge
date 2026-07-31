import { describe, expect, it } from "vitest";

import { resolveWidgetDomain } from "./requestOrigin.js";

describe("resolveWidgetDomain", () => {
  it("returns the registrable domain for an ordinary subdomain", () => {
    expect(resolveWidgetDomain("https://capitals.skybridge.tech")).toBe(
      "skybridge.tech",
    );
  });

  it("keeps tenants isolated on private suffixes", () => {
    expect(resolveWidgetDomain("https://alice.github.io")).toBe(
      "alice.github.io",
    );
    expect(resolveWidgetDomain("https://bob.github.io")).toBe("bob.github.io");
  });

  it("keeps the origin fallback for non-registrable hosts", () => {
    expect(resolveWidgetDomain("http://localhost:3000")).toBe(
      "http://localhost:3000",
    );
  });
});
