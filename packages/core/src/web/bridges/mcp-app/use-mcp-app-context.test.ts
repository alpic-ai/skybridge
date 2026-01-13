import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getMcpAppHostPostMessageMock,
  MockResizeObserver,
} from "../../hooks/test/utils.js";
import { McpAppBridge } from "./bridge.js";
import { useMcpAppContext } from "./use-mcp-app-context.js";

describe("useMcpAppContext", () => {
  beforeEach(async () => {
    vi.stubGlobal("skybridge", { hostType: "mcp-app" });
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    McpAppBridge.resetInstance();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("should return the theme value from host context and update on notification", async () => {
    vi.stubGlobal("parent", {
      postMessage: getMcpAppHostPostMessageMock({ theme: "light" }),
    });
    const { result } = renderHook(() => useMcpAppContext("theme"));

    await waitFor(() => {
      expect(result.current).toBe("light");
    });
  });

  it("should reject the request after timeout", async () => {
    vi.useFakeTimers();
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const nonRespondingMock = vi.fn();
    vi.stubGlobal("parent", { postMessage: nonRespondingMock });

    renderHook(() => useMcpAppContext("theme", undefined, 100));

    expect(nonRespondingMock).toHaveBeenCalledWith(
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
  });

  it("should send size-changed notification after successful initialization", async () => {
    const postMessageMock = getMcpAppHostPostMessageMock({ theme: "light" });
    vi.stubGlobal("parent", { postMessage: postMessageMock });

    renderHook(() => useMcpAppContext("theme"));

    await waitFor(() => {
      expect(postMessageMock).toHaveBeenCalledWith(
        expect.objectContaining({
          jsonrpc: "2.0",
          method: "ui/notifications/size-changed",
          params: expect.objectContaining({
            width: expect.any(Number),
            height: expect.any(Number),
          }),
        }),
        "*",
      );
    });
  });
});
