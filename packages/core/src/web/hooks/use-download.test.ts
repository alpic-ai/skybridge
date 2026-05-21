import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppsSdkAdaptor } from "../bridges/apps-sdk/adaptor.js";
import { McpAppBridge } from "../bridges/mcp-app/bridge.js";
import type { DownloadParams } from "../bridges/types.js";
import {
  getMcpAppHostPostMessageMock,
  MockResizeObserver,
} from "./test/utils.js";
import { useDownload } from "./use-download.js";

const params: DownloadParams = {
  contents: [
    {
      type: "resource",
      resource: {
        uri: "file:///export.json",
        mimeType: "application/json",
        text: '{"hello":"world"}',
      },
    },
  ],
};

describe("useDownload", () => {
  describe("apps-sdk host", () => {
    beforeEach(() => {
      vi.stubGlobal("openai", {});
      vi.stubGlobal("skybridge", { hostType: "apps-sdk" });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.resetAllMocks();
      AppsSdkAdaptor.resetInstance();
    });

    it("returns { isError: true } and logs an error", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { result } = renderHook(() => useDownload());

      const res = await result.current.download(params);

      expect(res).toEqual({ isError: true });
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("not supported on Apps SDK"),
      );
    });
  });

  describe("mcp-app host without downloadFile capability", () => {
    beforeEach(() => {
      vi.stubGlobal("skybridge", { hostType: "mcp-app" });
      vi.stubGlobal("ResizeObserver", MockResizeObserver);
      vi.stubGlobal("parent", { postMessage: getMcpAppHostPostMessageMock() });
    });

    afterEach(async () => {
      vi.unstubAllGlobals();
      vi.resetAllMocks();
      McpAppBridge.resetInstance();
    });

    it("returns { isError: true } and logs an error", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { result } = renderHook(() => useDownload());

      const res = await result.current.download(params);

      expect(res).toEqual({ isError: true });
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("does not support ui/download-file"),
      );
    });
  });

  describe("mcp-app host with downloadFile capability", () => {
    let postMessageMock: ReturnType<typeof getMcpAppHostPostMessageMock>;

    beforeEach(() => {
      vi.stubGlobal("skybridge", { hostType: "mcp-app" });
      vi.stubGlobal("ResizeObserver", MockResizeObserver);
      postMessageMock = getMcpAppHostPostMessageMock(
        {},
        { hostCapabilities: { downloadFile: {} } },
      );
      vi.stubGlobal("parent", { postMessage: postMessageMock });
    });

    afterEach(async () => {
      vi.unstubAllGlobals();
      vi.resetAllMocks();
      McpAppBridge.resetInstance();
    });

    it("sends ui/download-file with the provided contents", async () => {
      const { result } = renderHook(() => useDownload());

      const res = await result.current.download(params);

      expect(res).toEqual({});
      await waitFor(() => {
        expect(postMessageMock).toHaveBeenCalledWith(
          expect.objectContaining({
            jsonrpc: "2.0",
            method: "ui/download-file",
            params,
          }),
          "*",
        );
      });
    });

    it("returns { isError: true } when the host denies the request", async () => {
      McpAppBridge.resetInstance();
      postMessageMock = getMcpAppHostPostMessageMock(
        {},
        {
          hostCapabilities: { downloadFile: {} },
          downloadFileResult: { isError: true },
        },
      );
      vi.stubGlobal("parent", { postMessage: postMessageMock });

      const { result } = renderHook(() => useDownload());

      const res = await result.current.download(params);

      expect(res).toEqual({ isError: true });
    });
  });
});
