import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { McpAppBridge } from "../bridges/mcp-app/bridge.js";
import {
  getMcpAppHostPostMessageMock,
  MockResizeObserver,
} from "./test/utils.js";
import { useOpenExternal } from "./use-open-external.js";

describe("useOpenExternal", () => {
  describe("apps-sdk host", () => {
    let openExternalMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      openExternalMock = vi.fn();
      vi.stubGlobal("openai", {
        openExternal: openExternalMock,
      });
      vi.stubGlobal("skybridge", { hostType: "apps-sdk" });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.resetAllMocks();
    });

    it("should return a function that calls window.openai.openExternal with the href", () => {
      const { result } = renderHook(() => useOpenExternal());

      const href = "https://example.com";
      result.current(href);

      expect(openExternalMock).toHaveBeenCalledTimes(1);
      expect(openExternalMock).toHaveBeenCalledWith({ href });
    });

    it("should forward redirectUrl false option to window.openai.openExternal", () => {
      const { result } = renderHook(() => useOpenExternal());

      const href = "https://example.com";
      result.current(href, { redirectUrl: false });

      expect(openExternalMock).toHaveBeenCalledTimes(1);
      expect(openExternalMock).toHaveBeenCalledWith({
        href,
        redirectUrl: false,
      });
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
      await McpAppBridge.resetInstance();
    });

    it("should return a function that sends ui/open-link request to the MCP host", async () => {
      const { result } = renderHook(() => useOpenExternal());

      const href = "https://example.com";
      result.current(href, { redirectUrl: false });

      await waitFor(() => {
        expect(postMessageMock).toHaveBeenCalledWith(
          expect.objectContaining({
            jsonrpc: "2.0",
            method: "ui/open-link",
            params: { url: href },
          }),
          "*",
        );
      });
    });
  });
});
