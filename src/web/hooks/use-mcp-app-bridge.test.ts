import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useMcpAppBridge", () => {
  let mockPostMessage: ReturnType<typeof vi.fn>;

  const useHook = async () => {
    const { useMcpAppBridge } = await import("./use-mcp-app-bridge.js");
    return useMcpAppBridge;
  };

  beforeEach(() => {
    vi.resetModules();
    mockPostMessage = vi.fn();
    Object.defineProperty(window, "parent", {
      value: { postMessage: mockPostMessage },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return the theme value from host context", async () => {
    const useMcpAppBridge = await useHook();
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
});
