import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppsSdkAdaptor } from "../bridges/apps-sdk/adaptor.js";
import { McpAppBridge } from "../bridges/mcp-app/bridge.js";
import {
  getMcpAppHostPostMessageMock,
  MockResizeObserver,
} from "./test/utils.js";
import { useRequestSize } from "./use-request-size.js";

describe("useRequestSize", () => {
  describe("apps-sdk host", () => {
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      AppsSdkAdaptor.resetInstance();
      vi.stubGlobal("openai", {});
      vi.stubGlobal("skybridge", { hostType: "apps-sdk" });
      consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
      AppsSdkAdaptor.resetInstance();
      vi.unstubAllGlobals();
      vi.resetAllMocks();
    });

    it("warns that requestSize is not supported on Apps SDK", async () => {
      const { result } = renderHook(() => useRequestSize());

      await result.current({ height: 400 });

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy.mock.calls[0]?.[0]).toContain("not supported");
    });
  });

  describe("mcp-app host", () => {
    let postMessageMock: ReturnType<typeof getMcpAppHostPostMessageMock>;

    beforeEach(() => {
      vi.stubGlobal("skybridge", { hostType: "mcp-app" });
      vi.stubGlobal("ResizeObserver", MockResizeObserver);
      postMessageMock = getMcpAppHostPostMessageMock();
      vi.stubGlobal("parent", { postMessage: postMessageMock });
    });

    afterEach(async () => {
      vi.unstubAllGlobals();
      vi.resetAllMocks();
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
});
