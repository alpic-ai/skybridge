import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HostAdaptor } from "../bridges/adaptor.js";
import { McpAppBridge } from "../bridges/mcp-app/bridge.js";
import {
  getMcpAppHostPostMessageMock,
  MockResizeObserver,
} from "./test/utils.js";
import { useRequestSize } from "./use-request-size.js";

describe("useRequestSize", () => {
  let postMessageMock: ReturnType<typeof getMcpAppHostPostMessageMock>;

  beforeEach(() => {
    HostAdaptor.resetInstance();
    McpAppBridge.resetInstance();
    vi.stubGlobal("skybridge", { hostType: "mcp-app" });
    vi.stubGlobal("openai", undefined);
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    postMessageMock = getMcpAppHostPostMessageMock();
    vi.stubGlobal("parent", { postMessage: postMessageMock });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
    HostAdaptor.resetInstance();
    McpAppBridge.resetInstance();
  });

  it("sends a ui/notifications/size-changed notification with width and height", async () => {
    const { result } = renderHook(() => useRequestSize());

    await result.current({ width: 800, height: 400 });

    await waitFor(() => {
      expect(postMessageMock).toHaveBeenCalledWith(
        expect.objectContaining({
          jsonrpc: "2.0",
          method: "ui/notifications/size-changed",
          params: { width: 800, height: 400 },
        }),
        "*",
      );
    });
  });

  it("forwards height-only payloads as-is", async () => {
    const { result } = renderHook(() => useRequestSize());

    await result.current({ height: 400 });

    await waitFor(() => {
      expect(postMessageMock).toHaveBeenCalledWith(
        expect.objectContaining({
          jsonrpc: "2.0",
          method: "ui/notifications/size-changed",
          params: { height: 400 },
        }),
        "*",
      );
    });
  });
});
