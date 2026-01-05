import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { McpAppBridge } from "../bridges/mcp-app-bridge.js";
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
  });

  describe("mcp-app host", () => {
    const mockPostMessage = vi.fn();

    beforeEach(() => {
      vi.stubGlobal("parent", { postMessage: mockPostMessage });
      vi.stubGlobal("skybridge", { hostType: "mcp-app" });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.resetAllMocks();
      McpAppBridge.resetInstance();
    });

    it("should return a function that sends ui/open-link request to the MCP host", () => {
      const { result } = renderHook(() => useOpenExternal());

      const href = "https://example.com";
      result.current(href);

      expect(mockPostMessage).toHaveBeenCalledWith(
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
