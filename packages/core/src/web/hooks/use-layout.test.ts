import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { McpAppAdaptor } from "../bridges/mcp-app/adaptor.js";
import { McpAppBridge } from "../bridges/mcp-app/bridge.js";
import type { SafeArea, Theme } from "../bridges/types.js";
import { getMcpAppHostPostMessageMock, MockResizeObserver } from "./test/utils.js";
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
    beforeEach(() => {
      vi.stubGlobal("skybridge", { hostType: "mcp-app" });
      vi.stubGlobal("ResizeObserver", MockResizeObserver);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.resetAllMocks();
      McpAppBridge.resetInstance();
      McpAppAdaptor.resetInstance();
    });

    it("should return theme, maxHeight, and safeArea from mcp host context", async () => {
      vi.stubGlobal("parent", {
        postMessage: getMcpAppHostPostMessageMock({
          theme: "dark",
          containerDimensions: { height: 400, width: 400, maxHeight: 800 },
          safeAreaInsets: { top: 20, right: 0, bottom: 34, left: 0 },
        }),
      });
      const { result } = renderHook(() => useLayout());

      await waitFor(() => {
        expect(result.current.theme).toBe("dark");
        expect(result.current.maxHeight).toBe(800);
        expect(result.current.safeArea).toEqual({
          insets: { top: 20, right: 0, bottom: 34, left: 0 },
        });
      });
    });

    it("should maintain safeArea referential stability when data has not changed", async () => {
      vi.stubGlobal("parent", {
        postMessage: getMcpAppHostPostMessageMock({
          theme: "light",
          containerDimensions: { height: 400, width: 400, maxHeight: 500 },
          safeAreaInsets: { top: 44, right: 0, bottom: 34, left: 0 },
        }),
      });
      const { result, rerender } = renderHook(() => useLayout());

      await waitFor(() => {
        expect(result.current.safeArea).toBeDefined();
      });

      const initialSafeArea = result.current.safeArea;

      rerender();

      expect(result.current.safeArea).toBe(initialSafeArea);
    });
  });
});
