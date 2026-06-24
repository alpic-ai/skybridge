import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { McpAppBridge } from "./bridge.js";

describe("McpAppBridge.getInstance", () => {
  beforeEach(() => {
    McpAppBridge.resetInstance();
    vi.stubGlobal("parent", { postMessage: vi.fn() });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    McpAppBridge.resetInstance();
  });

  it("instantiates regardless of injected hostType", () => {
    vi.stubGlobal("skybridge", { hostType: "apps-sdk" });
    expect(() => McpAppBridge.getInstance()).not.toThrow();
  });
});
