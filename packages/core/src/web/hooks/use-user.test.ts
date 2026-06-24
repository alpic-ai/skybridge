import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HostAdaptor } from "../bridges/adaptor.js";
import { McpAppBridge } from "../bridges/mcp-app/bridge.js";
import {
  getMcpAppHostPostMessageMock,
  MockResizeObserver,
} from "./test/utils.js";
import { useUser } from "./use-user.js";

describe("useUser", () => {
  describe("apps-sdk host type", () => {
    beforeEach(() => {
      HostAdaptor.resetInstance();
      McpAppBridge.resetInstance();
      vi.stubGlobal("openai", { locale: "en-US" });
      vi.stubGlobal("skybridge", { hostType: "apps-sdk" });
      vi.stubGlobal("ResizeObserver", MockResizeObserver);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.resetAllMocks();
      McpAppBridge.resetInstance();
      HostAdaptor.resetInstance();
    });

    it("should return locale and userAgent from mcp host context", async () => {
      vi.stubGlobal("parent", {
        postMessage: getMcpAppHostPostMessageMock({
          locale: "en-US",
          platform: "web",
          deviceCapabilities: { hover: true, touch: false },
        }),
      });
      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.locale).toBe("en-US");
        expect(result.current.userAgent).toEqual({
          device: { type: "desktop" },
          capabilities: { hover: true, touch: false },
        });
      });
    });

    it("should return mobile userAgent when set to mobile", async () => {
      vi.stubGlobal("parent", {
        postMessage: getMcpAppHostPostMessageMock({
          locale: "en-US",
          platform: "mobile",
          deviceCapabilities: { hover: false, touch: true },
        }),
      });
      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.userAgent.device.type).toBe("mobile");
        expect(result.current.userAgent.capabilities.touch).toBe(true);
      });
    });

    it("should return different locale when set", async () => {
      vi.stubGlobal("parent", {
        postMessage: getMcpAppHostPostMessageMock({
          locale: "es-ES",
          platform: "web",
          deviceCapabilities: { hover: true, touch: false },
        }),
      });
      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.locale).toBe("es-ES");
      });
    });

    it("should normalize underscore locale to BCP 47 hyphen format", async () => {
      vi.stubGlobal("parent", {
        postMessage: getMcpAppHostPostMessageMock({
          locale: "fr_FR",
          platform: "web",
          deviceCapabilities: { hover: true, touch: false },
        }),
      });
      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.locale).toBe("fr-FR");
      });
    });

    it("should canonicalize locale casing", async () => {
      vi.stubGlobal("parent", {
        postMessage: getMcpAppHostPostMessageMock({
          locale: "en-us",
          platform: "web",
          deviceCapabilities: { hover: true, touch: false },
        }),
      });
      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.locale).toBe("en-US");
      });
    });

    it("should fall back to en-US for invalid locale", async () => {
      vi.stubGlobal("parent", {
        postMessage: getMcpAppHostPostMessageMock({
          locale: "not-a-locale-!!",
          platform: "web",
          deviceCapabilities: { hover: true, touch: false },
        }),
      });
      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.locale).toBe("en-US");
      });
    });
  });

  describe("mcp-app host type", () => {
    beforeEach(() => {
      HostAdaptor.resetInstance();
      McpAppBridge.resetInstance();
      vi.stubGlobal("openai", undefined);
      vi.stubGlobal("skybridge", { hostType: "mcp-app" });
      vi.stubGlobal("ResizeObserver", MockResizeObserver);
    });

    afterEach(async () => {
      vi.unstubAllGlobals();
      vi.resetAllMocks();
      McpAppBridge.resetInstance();
      HostAdaptor.resetInstance();
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

    it("should normalize underscore locale to BCP 47 hyphen format", async () => {
      vi.stubGlobal("parent", {
        postMessage: getMcpAppHostPostMessageMock({
          locale: "fr_FR",
          platform: "web",
          deviceCapabilities: { hover: true, touch: false },
        }),
      });
      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.locale).toBe("fr-FR");
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
