import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useMcpAppBridge", () => {
  let mockPostMessage: ReturnType<typeof vi.fn>;
  let mcpAppModule: typeof import("./use-mcp-app-bridge.js");

  const importModule = async () => {
    return import("./use-mcp-app-bridge.js");
  };

  beforeEach(async () => {
    vi.resetModules();
    mcpAppModule = await importModule();
    mockPostMessage = vi.fn();
    Object.defineProperty(window, "parent", {
      value: { postMessage: mockPostMessage },
      writable: true,
      configurable: true,
    });
    vi.stubGlobal("skybridge", { hostType: "mcp-app" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return the theme value from host context", async () => {
    const { useMcpAppBridge } = mcpAppModule;
    const { result } = renderHook(() => useMcpAppBridge("theme"));

    const initCall = mockPostMessage.mock.calls.find(
      (call) => call[0].method === "ui/initialize",
    );

    if (initCall) {
      act(() => {
        window.dispatchEvent(
          new MessageEvent("message", {
            data: {
              jsonrpc: "2.0",
              id: initCall[0].id,
              result: {
                protocolVersion: "2025-06-18",
                hostInfo: { name: "test-host", version: "1.0.0" },
                hostCapabilities: {},
                hostContext: { theme: "light" },
              },
            },
          }),
        );
      });
    }

    await waitFor(() => {
      expect(result.current).toBe("light");
    });
  });

  it("should reject the request after timeout", async () => {
    vi.useFakeTimers();
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { useMcpAppBridge, getMcpAppBridge } = mcpAppModule;
    const bridge = getMcpAppBridge(
      { appInfo: { name: "test", version: "1.0.0" } },
      100,
    );

    renderHook(() => useMcpAppBridge("theme"));

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ method: "ui/initialize" }),
      "*",
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      new Error("Request timed out"),
    );

    consoleErrorSpy.mockRestore();
    vi.useRealTimers();
    bridge.cleanup();
  });
});
