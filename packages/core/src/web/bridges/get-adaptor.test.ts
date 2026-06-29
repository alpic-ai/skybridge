import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HostAdaptor } from "./adaptor.js";
import { AppsSdkBridge } from "./apps-sdk/bridge.js";
import { getAdaptor } from "./get-adaptor.js";
import { McpAppBridge } from "./mcp-app/bridge.js";

describe("getAdaptor", () => {
  beforeEach(() => {
    HostAdaptor.resetInstance();
    McpAppBridge.resetInstance();
    AppsSdkBridge.resetInstance();
    vi.stubGlobal("parent", { postMessage: vi.fn() });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    HostAdaptor.resetInstance();
    McpAppBridge.resetInstance();
    AppsSdkBridge.resetInstance();
  });

  it("returns a HostAdaptor instance", () => {
    vi.stubGlobal("skybridge", { hostType: "mcp-app" });
    vi.stubGlobal("openai", undefined);
    expect(getAdaptor()).toBeInstanceOf(HostAdaptor);
  });

  it("memoizes the instance", () => {
    vi.stubGlobal("skybridge", { hostType: "mcp-app" });
    vi.stubGlobal("openai", undefined);
    const a = getAdaptor();
    const b = getAdaptor();
    expect(a).toBe(b);
  });
});
