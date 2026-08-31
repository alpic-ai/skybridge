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

  it("instantiates without injected globals", () => {
    vi.stubGlobal("skybridge", {});
    expect(() => McpAppBridge.getInstance()).not.toThrow();
  });
});
