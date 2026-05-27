import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _resetAdaptor, getAdaptor } from "../bridges/get-adaptor.js";
import { McpAppBridge } from "../bridges/mcp-app/bridge.js";
import { useRequestClose } from "./use-request-close.js";

describe("useRequestClose", () => {
  beforeEach(() => {
    _resetAdaptor();
    McpAppBridge.resetInstance();
    vi.stubGlobal("skybridge", { hostType: "mcp-app" });
    vi.stubGlobal("openai", undefined);
    vi.stubGlobal("parent", { postMessage: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
    _resetAdaptor();
    McpAppBridge.resetInstance();
  });

  it("calls app.requestTeardown via the MCP path", async () => {
    const requestTeardown = vi.fn().mockResolvedValue(undefined);
    // biome-ignore lint/suspicious/noExplicitAny: test seam
    const adaptor = getAdaptor() as any;
    adaptor.mcp.getApp = vi.fn().mockResolvedValue({ requestTeardown });

    const { result } = renderHook(() => useRequestClose());
    await act(async () => {
      await result.current();
    });

    expect(requestTeardown).toHaveBeenCalledTimes(1);
  });

  it("calls app.requestTeardown even when window.openai is present", async () => {
    vi.stubGlobal("openai", { requestClose: vi.fn() });
    _resetAdaptor();
    McpAppBridge.resetInstance();

    const requestTeardown = vi.fn().mockResolvedValue(undefined);
    // biome-ignore lint/suspicious/noExplicitAny: test seam
    const adaptor = getAdaptor() as any;
    adaptor.mcp.getApp = vi.fn().mockResolvedValue({ requestTeardown });

    const { result } = renderHook(() => useRequestClose());
    await act(async () => {
      await result.current();
    });

    expect(requestTeardown).toHaveBeenCalledTimes(1);
  });
});
