import { describe, expect, it } from "vitest";
import { toIssuerUrl } from "./shared.js";

describe("toIssuerUrl", () => {
  it("adds https to a bare host, preserves an explicit scheme, strips a trailing slash", () => {
    expect(toIssuerUrl("acme.authkit.app")).toBe("https://acme.authkit.app");
    expect(toIssuerUrl("https://acme.authkit.app/")).toBe(
      "https://acme.authkit.app",
    );
    expect(toIssuerUrl("http://localhost:3000")).toBe("http://localhost:3000");
  });
});
