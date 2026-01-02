import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { McpAppAdaptor } from "../bridges/adaptors/mcp-app-adaptor.js";
import { McpAppBridge } from "../bridges/mcp-app-bridge.js";
import type { UserAgent } from "../types.js";
import { getMcpAppHostPostMessageMock } from "./test/utils.js";
import { useUser } from "./use-user.js";

describe("useUser", () => {
  describe("apps-sdk host type", () => {
    let OpenaiMock: {
      locale: string;
      userAgent: UserAgent;
    };

    beforeEach(() => {
      OpenaiMock = {
        locale: "en-US",
        userAgent: {
          device: { type: "desktop" },
          capabilities: { hover: true, touch: false },
        },
      };
      vi.stubGlobal("openai", OpenaiMock);
      vi.stubGlobal("skybridge", { hostType: "apps-sdk" });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.resetAllMocks();
    });

    it("should return locale and userAgent from window.openai", () => {
      const { result } = renderHook(() => useUser());

      expect(result.current.locale).toBe("en-US");
      expect(result.current.userAgent).toEqual({
        device: { type: "desktop" },
        capabilities: { hover: true, touch: false },
      });
    });

    it("should return mobile userAgent when set to mobile", () => {
      OpenaiMock.userAgent = {
        device: { type: "mobile" },
        capabilities: { hover: false, touch: true },
      };
      const { result } = renderHook(() => useUser());

      expect(result.current.userAgent.device.type).toBe("mobile");
      expect(result.current.userAgent.capabilities.touch).toBe(true);
    });

    it("should return different locale when set", () => {
      OpenaiMock.locale = "es-ES";
      const { result } = renderHook(() => useUser());

      expect(result.current.locale).toBe("es-ES");
    });
  });

  describe("mcp-app host type", () => {
    beforeEach(() => {
      vi.stubGlobal("skybridge", { hostType: "mcp-app" });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.resetAllMocks();
      McpAppBridge.resetInstance();
      McpAppAdaptor.resetInstance();
    });

    it("should return locale and userAgent from mcp host context", async () => {
      vi.stubGlobal("parent", {
        postMessage: getMcpAppHostPostMessageMock({
          locale: "fr-FR",
          platform: "web",
          deviceCapabilities: { hover: true, touch: false },
        }),
      });
      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.locale).toBe("fr-FR");
        expect(result.current.userAgent).toEqual({
          device: { type: "desktop" },
          capabilities: { hover: true, touch: false },
        });
      });
    });

    it("should maintain userAgent referential stability when data has not changed", async () => {
      vi.stubGlobal("parent", {
        postMessage: getMcpAppHostPostMessageMock({
          locale: "en-US",
          platform: "web",
          deviceCapabilities: { hover: true, touch: false },
        }),
      });
      const { result, rerender } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.userAgent).toBeDefined();
      });

      const initialUserAgent = result.current.userAgent;

      rerender();

      expect(result.current.userAgent).toBe(initialUserAgent);
    });
  });
});
