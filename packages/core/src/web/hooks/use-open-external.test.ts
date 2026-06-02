import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _resetAdaptor } from "../bridges/get-adaptor.js";
import { McpAppBridge } from "../bridges/mcp-app/bridge.js";
import {
  getMcpAppHostPostMessageMock,
  MockResizeObserver,
} from "./test/utils.js";
import { useOpenExternal } from "./use-open-external.js";

describe("useOpenExternal", () => {
  describe("apps-sdk host", () => {
    let openExternalMock: ReturnType<typeof vi.fn>;
    let postMessageMock: ReturnType<typeof getMcpAppHostPostMessageMock>;

    beforeEach(() => {
      openExternalMock = vi.fn();
      vi.stubGlobal("openai", {
        openExternal: openExternalMock,
      });
      vi.stubGlobal("skybridge", { hostType: "apps-sdk" });
      vi.stubGlobal("ResizeObserver", MockResizeObserver);
      postMessageMock = getMcpAppHostPostMessageMock();
      vi.stubGlobal("parent", { postMessage: postMessageMock });
    });

    afterEach(() => {
      _resetAdaptor();
      McpAppBridge.resetInstance();
      vi.unstubAllGlobals();
      vi.resetAllMocks();
    });

    it("should fall back to mcp openLink when no redirectUrl option is given", async () => {
      const { result } = renderHook(() => useOpenExternal());

      const href = "https://example.com";
      result.current(href);

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

    it("should call window.openai.openExternal when redirectUrl is false", () => {
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
      vi.stubGlobal("openai", undefined);
      vi.stubGlobal("skybridge", { hostType: "mcp-app" });
      vi.stubGlobal("ResizeObserver", MockResizeObserver);
      postMessageMock = getMcpAppHostPostMessageMock();
      vi.stubGlobal("parent", { postMessage: postMessageMock });
    });

    afterEach(async () => {
      _resetAdaptor();
      McpAppBridge.resetInstance();
      vi.unstubAllGlobals();
      vi.resetAllMocks();
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
