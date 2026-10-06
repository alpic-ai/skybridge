import { describe, expect, it } from "vitest";
import { resolveServerOrigin } from "./requestOrigin.js";

const headers =
  (map: Record<string, string>) =>
  (key: string): string | undefined =>
    map[key];

describe("resolveServerOrigin", () => {
  it("uses http for loopback hosts, including *.localhost", () => {
    expect(resolveServerOrigin(headers({ host: "localhost:3000" }))).toBe(
      "http://localhost:3000",
    );
    expect(resolveServerOrigin(headers({ host: "127.0.0.1:3000" }))).toBe(
      "http://127.0.0.1:3000",
    );
    expect(resolveServerOrigin(headers({ host: "[::1]:3000" }))).toBe(
      "http://[::1]:3000",
    );
    expect(resolveServerOrigin(headers({ host: "chift.localhost:4000" }))).toBe(
      "http://chift.localhost:4000",
    );
  });

  it("uses https for public hosts", () => {
    expect(resolveServerOrigin(headers({ host: "app.example.com" }))).toBe(
      "https://app.example.com",
    );
    expect(
      resolveServerOrigin(headers({ host: "localhost.example.com:3000" })),
    ).toBe("https://localhost.example.com:3000");
  });

  it("defaults a forwarded loopback host to http when proto is absent", () => {
    expect(
      resolveServerOrigin(
        headers({ "x-forwarded-host": "chift.localhost:4000" }),
      ),
    ).toBe("http://chift.localhost:4000");
  });

  it("keeps an explicit forwarded proto", () => {
    expect(
      resolveServerOrigin(
        headers({
          "x-forwarded-host": "chift.localhost:4000",
          "x-forwarded-proto": "https",
        }),
      ),
    ).toBe("https://chift.localhost:4000");
  });

  it("falls back to the local dev origin when no host is present", () => {
    expect(resolveServerOrigin(headers({}))).toBe("http://localhost:3000");
  });
});
