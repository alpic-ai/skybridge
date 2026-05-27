import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HostAdaptor } from "./adaptor.js";
import { AppsSdkBridge } from "./apps-sdk/bridge.js";
import { McpAppBridge } from "./mcp-app/bridge.js";

describe("HostAdaptor constructor", () => {
  beforeEach(() => {
    McpAppBridge.resetInstance();
    AppsSdkBridge.resetInstance();
    vi.stubGlobal("skybridge", { hostType: "mcp-app" });
    vi.stubGlobal("parent", { postMessage: vi.fn() });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    McpAppBridge.resetInstance();
    AppsSdkBridge.resetInstance();
  });

  it("instantiates without window.openai (oai is null)", () => {
    vi.stubGlobal("openai", undefined);
    const adaptor = new HostAdaptor();
    expect(adaptor.hasAppsSdkOverlay()).toBe(false);
  });

  it("captures window.openai when present (oai is set)", () => {
    vi.stubGlobal("openai", { widgetState: null });
    const adaptor = new HostAdaptor();
    expect(adaptor.hasAppsSdkOverlay()).toBe(true);
  });
});
