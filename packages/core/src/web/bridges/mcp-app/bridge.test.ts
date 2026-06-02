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

  it("instantiates when hostType is apps-sdk", () => {
    vi.stubGlobal("skybridge", { hostType: "apps-sdk" });
    expect(() => McpAppBridge.getInstance()).not.toThrow();
  });

  it("instantiates when hostType is mcp-app", () => {
    vi.stubGlobal("skybridge", { hostType: "mcp-app" });
    expect(() => McpAppBridge.getInstance()).not.toThrow();
  });
});
