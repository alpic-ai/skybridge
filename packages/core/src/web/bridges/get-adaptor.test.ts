import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HostAdaptor } from "./adaptor.js";
import { AppsSdkBridge } from "./apps-sdk/bridge.js";
import { _resetAdaptor, getAdaptor } from "./get-adaptor.js";
import { McpAppBridge } from "./mcp-app/bridge.js";

describe("getAdaptor", () => {
  beforeEach(() => {
    _resetAdaptor();
    McpAppBridge.resetInstance();
    AppsSdkBridge.resetInstance();
    vi.stubGlobal("parent", { postMessage: vi.fn() });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    _resetAdaptor();
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

  it("logs a warning when hostType disagrees with probe", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("skybridge", { hostType: "mcp-app" });
    vi.stubGlobal("openai", { view: { mode: "inline" } });
    getAdaptor();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("hostType"));
    warn.mockRestore();
  });

  it("does not warn when hostType matches probe", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("skybridge", { hostType: "apps-sdk" });
    vi.stubGlobal("openai", { view: { mode: "inline" } });
    getAdaptor();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
