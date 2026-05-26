import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { McpAppBridge } from "../bridges/mcp-app/bridge.js";
import {
  getMcpAppHostPostMessageMock,
  MockResizeObserver,
} from "./test/utils.js";
import { useRequestClose } from "./use-request-close.js";

describe("useRequestClose", () => {
  describe("apps-sdk host", () => {
    let requestCloseMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      requestCloseMock = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal("openai", {
        requestClose: requestCloseMock,
      });
      vi.stubGlobal("skybridge", { hostType: "apps-sdk" });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.resetAllMocks();
    });

    it("should return a function that calls window.openai.requestClose", async () => {
      const { result } = renderHook(() => useRequestClose());

      await result.current();

      expect(requestCloseMock).toHaveBeenCalledTimes(1);
      expect(requestCloseMock).toHaveBeenCalledWith();
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

    it("should send a ui/notifications/request-teardown notification to the MCP host", async () => {
      const { result } = renderHook(() => useRequestClose());

      await result.current();

      await waitFor(() => {
        expect(postMessageMock).toHaveBeenCalledWith(
          expect.objectContaining({
            jsonrpc: "2.0",
            method: "ui/notifications/request-teardown",
          }),
          "*",
        );
      });
    });
  });
});
