import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppsSdkAdaptor } from "../bridges/apps-sdk/adaptor.js";
import { useSetOpenInAppUrl } from "./use-set-open-in-app-url.js";

describe("useSetOpenInAppUrl", () => {
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
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.resetAllMocks();
      AppsSdkAdaptor.resetInstance();
    });

    it("should return a function that calls window.openai.setOpenInAppUrl with the href", async () => {
      const { result } = renderHook(() => useSetOpenInAppUrl());

      const href = "https://example.com/path";
      await result.current(href);

      expect(setOpenInAppUrlMock).toHaveBeenCalledTimes(1);
      expect(setOpenInAppUrlMock).toHaveBeenCalledWith({ href });
    });

    it("should throw an error when href is empty", () => {
      const { result } = renderHook(() => useSetOpenInAppUrl());

      expect(() => result.current("")).toThrow(
        "The href parameter is required.",
      );
    });

    it("should throw an error when serverUrl is not set", () => {
      vi.stubGlobal("skybridge", {
        hostType: "apps-sdk",
        serverUrl: undefined,
      });
      AppsSdkAdaptor.resetInstance();

      const { result } = renderHook(() => useSetOpenInAppUrl());

      expect(() => result.current("https://example.com/path")).toThrow(
        "The widgetDomain property has not been set on the widget resource meta object.",
      );
    });

    it("should throw an error when href origin differs from serverUrl origin", () => {
      const { result } = renderHook(() => useSetOpenInAppUrl());

      expect(() => result.current("https://different-domain.com/path")).toThrow(
        "Provided href is not compatible with widget domain: origin differs",
      );
    });
  });
});
