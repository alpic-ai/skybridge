import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMcpAppHostPostMessageMock } from "../../hooks/test/utils.js";
import { McpAppBridge } from "../mcp-app-bridge.js";
import { useMcpAppBridge } from "./use-mcp-app-bridge.js";

describe("useMcpAppBridge", () => {
  beforeEach(async () => {
    vi.stubGlobal("skybridge", { hostType: "mcp-app" });
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
    const { result } = renderHook(() => useMcpAppBridge("theme"));

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

    renderHook(() => useMcpAppBridge("theme", undefined, 100));

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
});
