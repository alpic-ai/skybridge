import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppsSdkBridge } from "../bridges/apps-sdk/bridge.js";
import { _resetAdaptor } from "../bridges/get-adaptor.js";
import { McpAppBridge } from "../bridges/mcp-app/bridge.js";
import { NotSupportedError } from "../bridges/types.js";
import { useSetOpenInAppUrl } from "./use-set-open-in-app-url.js";

describe("useSetOpenInAppUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
    _resetAdaptor();
    AppsSdkBridge.resetInstance();
    McpAppBridge.resetInstance();
  });

  describe("apps-sdk host", () => {
    let setOpenInAppUrlMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      setOpenInAppUrlMock = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal("openai", {
        setOpenInAppUrl: setOpenInAppUrlMock,
      });
      vi.stubGlobal("skybridge", {
        hostType: "apps-sdk",
        serverUrl: "https://example.com",
      });
      vi.stubGlobal("parent", { postMessage: vi.fn() });
    });

    it("should return a function that calls window.openai.setOpenInAppUrl with the href", async () => {
      const { result } = renderHook(() => useSetOpenInAppUrl());

      const href = "https://example.com/path";
      await result.current(href);

      expect(setOpenInAppUrlMock).toHaveBeenCalledTimes(1);
      expect(setOpenInAppUrlMock).toHaveBeenCalledWith({ href });
    });

    it("should reject when href is empty", async () => {
      const { result } = renderHook(() => useSetOpenInAppUrl());

      await expect(result.current("")).rejects.toThrow(
        "The href parameter is required.",
      );
    });

    it("should call setOpenInAppUrl when href origin differs from serverUrl origin", async () => {
      const { result } = renderHook(() => useSetOpenInAppUrl());

      const href = "https://different-domain.com/path";
      await result.current(href);

      expect(setOpenInAppUrlMock).toHaveBeenCalledTimes(1);
      expect(setOpenInAppUrlMock).toHaveBeenCalledWith({ href });
    });
  });

  describe("mcp-app host", () => {
    beforeEach(() => {
      vi.stubGlobal("openai", undefined);
      vi.stubGlobal("skybridge", {
        hostType: "mcp-app",
        serverUrl: "https://example.com",
      });
      vi.stubGlobal("parent", { postMessage: vi.fn() });
    });

    it("should throw NotSupportedError when called from an MCP App runtime", async () => {
      const { result } = renderHook(() => useSetOpenInAppUrl());

      await expect(
        result.current("https://example.com/path"),
      ).rejects.toBeInstanceOf(NotSupportedError);
    });
  });
});
