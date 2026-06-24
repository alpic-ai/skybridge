import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HostAdaptor } from "../bridges/adaptor.js";
import { McpAppBridge } from "../bridges/mcp-app/index.js";
import {
  fireToolInputNotification,
  fireToolResultNotification,
  getMcpAppHostPostMessageMock,
  MockResizeObserver,
} from "./test/utils.js";
import { useToolInfo } from "./use-tool-info.js";

describe("useToolInfo", () => {
  describe("apps-sdk host", () => {
    beforeEach(() => {
      vi.stubGlobal("parent", { postMessage: getMcpAppHostPostMessageMock() });
      vi.stubGlobal("openai", {
        toolInput: null,
        toolOutput: null,
        toolResponseMetadata: null,
      });
      vi.stubGlobal("skybridge", { hostType: "apps-sdk" });
      vi.stubGlobal("ResizeObserver", MockResizeObserver);
    });

    afterEach(() => {
      HostAdaptor.resetInstance();
      vi.unstubAllGlobals();
      vi.resetAllMocks();
      McpAppBridge.resetInstance();
    });

    it("should return pending state with tool input from tool-input notification", async () => {
      const { result } = renderHook(() => useToolInfo());

      act(() => {
        fireToolInputNotification({
          name: "pokemon",
          args: { name: "pikachu" },
        });
      });

      await waitFor(() => {
        expect(result.current).toMatchObject({
          input: { name: "pokemon", args: { name: "pikachu" } },
          status: "pending",
          isIdle: false,
          isPending: true,
          isSuccess: false,
        });
      });
    });

    it("should return success state once tool-result notification arrives", async () => {
      const toolOutput = {
        name: "pikachu",
        color: "yellow",
        description:
          "When several of these POKéMON gather, their\felectricity could build and cause lightning storms.",
      };
      const toolResponseMetadata = { id: 12 };
      const { result } = renderHook(() => useToolInfo());

      act(() => {
        fireToolInputNotification({
          name: "pokemon",
          args: { name: "pikachu" },
        });
        fireToolResultNotification({
          content: [{ type: "text", text: JSON.stringify(toolOutput) }],
          structuredContent: toolOutput,
          _meta: toolResponseMetadata,
        });
      });

      await waitFor(() => {
        expect(result.current).toMatchObject({
          status: "success",
          isIdle: false,
          isPending: false,
          isSuccess: true,
          output: toolOutput,
          responseMetadata: toolResponseMetadata,
        });
      });
    });
  });

  describe("mcp-app host", () => {
    beforeEach(() => {
      vi.stubGlobal("parent", { postMessage: getMcpAppHostPostMessageMock() });
      vi.stubGlobal("skybridge", { hostType: "mcp-app" });
      vi.stubGlobal("openai", undefined);
      vi.stubGlobal("ResizeObserver", MockResizeObserver);
    });

    afterEach(async () => {
      HostAdaptor.resetInstance();
      vi.unstubAllGlobals();
      vi.resetAllMocks();
      McpAppBridge.resetInstance();
    });

    it("should return pending state with undefined input before tool-input notification arrives", async () => {
      const { result } = renderHook(() => useToolInfo());

      await waitFor(() => {
        expect(result.current).toMatchObject({
          status: "pending",
          isIdle: false,
          isPending: true,
          isSuccess: false,
          input: undefined,
          output: null,
          responseMetadata: null,
        });
      });
    });

    it("should return pending state with tool input from tool-input notification", async () => {
      const { result } = renderHook(() => useToolInfo());

      act(() => {
        fireToolInputNotification({ name: "pokemon", query: "pikachu" });
      });

      await waitFor(() => {
        expect(result.current).toMatchObject({
          status: "pending",
          isIdle: false,
          isPending: true,
          isSuccess: false,
          input: { name: "pokemon", query: "pikachu" },
        });
      });
    });

    it("should return success state with output from tool-result notification", async () => {
      const { result } = renderHook(() => useToolInfo());

      act(() => {
        fireToolInputNotification({ name: "pokemon", query: "pikachu" });
        fireToolResultNotification({
          content: [{ type: "text", text: "Pikachu data" }],
          structuredContent: { name: "pikachu", color: "yellow" },
          _meta: { requestId: "123" },
        });
      });

      await waitFor(() => {
        expect(result.current).toMatchObject({
          status: "success",
          isIdle: false,
          isPending: false,
          isSuccess: true,
          input: { name: "pokemon", query: "pikachu" },
          output: { name: "pikachu", color: "yellow" },
          responseMetadata: { requestId: "123" },
        });
      });
    });
  });
});
