import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getMcpAppHostPostMessageMock,
  MockResizeObserver,
} from "../../hooks/test/utils.js";
import { McpAppBridge } from "./bridge.js";
import { useMcpAppContext } from "./use-mcp-app-context.js";

describe("useMcpAppContext", () => {
  beforeEach(async () => {
    vi.stubGlobal("skybridge", {});
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
});
