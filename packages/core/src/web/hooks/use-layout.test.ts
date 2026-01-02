import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { McpAppBridge } from "../bridges/mcp-app-bridge.js";
import type { SafeArea, Theme } from "../types.js";
import { useLayout } from "./use-layout.js";

describe("useLayout", () => {
  describe("apps-sdk host type", () => {
    let OpenaiMock: {
      theme: Theme;
      maxHeight: number;
      safeArea: SafeArea;
    };

    beforeEach(() => {
      OpenaiMock = {
        theme: "light",
        maxHeight: 500,
        safeArea: { insets: { top: 0, bottom: 0, left: 0, right: 0 } },
      };
      vi.stubGlobal("openai", OpenaiMock);
      vi.stubGlobal("skybridge", { hostType: "apps-sdk" });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.resetAllMocks();
    });

    it("should return theme, maxHeight, and safeArea from window.openai", () => {
      const { result } = renderHook(() => useLayout());

      expect(result.current.theme).toBe("light");
      expect(result.current.maxHeight).toBe(500);
      expect(result.current.safeArea).toEqual({
        insets: { top: 0, bottom: 0, left: 0, right: 0 },
      });
    });

    it("should return dark theme when set to dark", () => {
      OpenaiMock.theme = "dark";
      const { result } = renderHook(() => useLayout());

      expect(result.current.theme).toBe("dark");
    });

    it("should return different maxHeight when set", () => {
      OpenaiMock.maxHeight = 800;
      const { result } = renderHook(() => useLayout());

      expect(result.current.maxHeight).toBe(800);
    });

    it("should return safeArea with insets when set", () => {
      OpenaiMock.safeArea = {
        insets: { top: 44, bottom: 34, left: 0, right: 0 },
      };
      const { result } = renderHook(() => useLayout());

      expect(result.current.safeArea.insets.top).toBe(44);
      expect(result.current.safeArea.insets.bottom).toBe(34);
    });
  });

  describe("mcp-app host type", () => {
    let mockPostMessage: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockPostMessage = vi.fn();
      Object.defineProperty(window, "parent", {
        value: { postMessage: mockPostMessage },
        writable: true,
        configurable: true,
      });
      vi.stubGlobal("skybridge", { hostType: "mcp-app" });
      McpAppBridge.resetInstance();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.resetAllMocks();
      McpAppBridge.resetInstance();
    });

    const sendMcpInitializeResponse = (
      context: Record<string, unknown>,
    ): void => {
      const initCall = mockPostMessage.mock.calls.find(
        (call) => call[0].method === "ui/initialize",
      );
      if (initCall) {
        act(() => {
          window.dispatchEvent(
            new MessageEvent("message", {
              data: {
                jsonrpc: "2.0",
                id: initCall[0].id,
                result: {
                  protocolVersion: "2025-06-18",
                  hostInfo: { name: "test-host", version: "1.0.0" },
                  hostCapabilities: {},
                  hostContext: context,
                },
              },
            }),
          );
        });
      }
    };

    it("should return theme, maxHeight, and safeArea from mcp host context", async () => {
      const { result } = renderHook(() => useLayout());

      sendMcpInitializeResponse({
        theme: "dark",
        viewport: { maxHeight: 800 },
        safeAreaInsets: { top: 20, right: 0, bottom: 34, left: 0 },
      });

      await waitFor(() => {
        expect(result.current.theme).toBe("dark");
        expect(result.current.maxHeight).toBe(800);
        expect(result.current.safeArea).toEqual({
          insets: { top: 20, right: 0, bottom: 34, left: 0 },
        });
      });
    });

    it("should maintain safeArea referential stability when data has not changed", async () => {
      const { result, rerender } = renderHook(() => useLayout());

      sendMcpInitializeResponse({
        theme: "light",
        viewport: { maxHeight: 500 },
        safeAreaInsets: { top: 44, right: 0, bottom: 34, left: 0 },
      });

      await waitFor(() => {
        expect(result.current.safeArea).toBeDefined();
      });

      const firstSafeAreaRef = result.current.safeArea;

      rerender();

      expect(result.current.safeArea).toBe(firstSafeAreaRef);
    });
  });
});
