import { act, fireEvent, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppsSdkBridge } from "../bridges/apps-sdk/bridge.js";
import { _resetAdaptor, getAdaptor } from "../bridges/get-adaptor.js";
import { McpAppBridge } from "../bridges/mcp-app/bridge.js";
import {
  getMcpAppHostPostMessageMock,
  MockResizeObserver,
} from "./test/utils.js";
import { useDisplayMode } from "./use-display-mode.js";

describe("useDisplayMode", () => {
  beforeEach(() => {
    _resetAdaptor();
    McpAppBridge.resetInstance();
    AppsSdkBridge.resetInstance();
    vi.stubGlobal("skybridge", { hostType: "apps-sdk" });
    vi.stubGlobal("openai", { view: { mode: "inline" } });
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
    _resetAdaptor();
    McpAppBridge.resetInstance();
    AppsSdkBridge.resetInstance();
  });

  it("should return the current display mode from MCP host context", async () => {
    vi.stubGlobal("parent", {
      postMessage: getMcpAppHostPostMessageMock({ displayMode: "inline" }),
    });

    const { result } = renderHook(() => useDisplayMode());

    await waitFor(() => {
      expect(result.current[0]).toBe("inline");
    });
  });

  it("should update display mode on host-context-changed notification", async () => {
    vi.stubGlobal("parent", {
      postMessage: getMcpAppHostPostMessageMock({ displayMode: "inline" }),
    });

    const { result } = renderHook(() => useDisplayMode());

    await waitFor(() => {
      expect(result.current[0]).toBe("inline");
    });

    act(() => {
      fireEvent(
        window,
        new MessageEvent("message", {
          source: window.parent,
          data: {
            jsonrpc: "2.0",
            method: "ui/notifications/host-context-changed",
            params: { displayMode: "fullscreen" },
          },
        }),
      );
    });

    await waitFor(() => {
      expect(result.current[0]).toBe("fullscreen");
    });
  });

  it("should call requestDisplayMode on the adaptor when setDisplayMode is called", async () => {
    vi.stubGlobal("parent", {
      postMessage: getMcpAppHostPostMessageMock({ displayMode: "inline" }),
    });

    const { result } = renderHook(() => useDisplayMode());

    await waitFor(() => expect(result.current[0]).toBe("inline"));

    // Patch mcp.getApp to avoid real protocol request
    const adaptor = getAdaptor();
    const fakeApp = {
      requestDisplayMode: vi.fn().mockResolvedValue({ mode: "fullscreen" }),
    };
    // biome-ignore lint/suspicious/noExplicitAny: test seam
    (adaptor as any).mcp.getApp = vi.fn().mockResolvedValue(fakeApp);

    await act(async () => {
      await result.current[1]("fullscreen");
    });

    expect(fakeApp.requestDisplayMode).toHaveBeenCalledWith({
      mode: "fullscreen",
    });
  });
});
