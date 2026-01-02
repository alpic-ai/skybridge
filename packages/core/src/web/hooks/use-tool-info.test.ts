import { act, fireEvent, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { McpAppAdapter } from "../bridges/mcp-app-adapter.js";
import { McpAppBridge } from "../bridges/mcp-app-bridge.js";
import {
  type OpenAiProperties,
  SET_GLOBALS_EVENT_TYPE,
  SetGlobalsEvent,
} from "../types.js";
import {
  fireToolInputNotification,
  fireToolResultNotification,
  getMcpAppHostPostMessageMock,
} from "./test/utils.js";
import { useToolInfo } from "./use-tool-info.js";

describe("useToolInfo", () => {
  describe("apps-sdk host", () => {
    let OpenaiMock: Pick<
      OpenAiProperties,
      "toolInput" | "toolOutput" | "toolResponseMetadata"
    >;

    beforeEach(() => {
      OpenaiMock = {
        toolInput: { name: "pokemon", args: { name: "pikachu" } },
        toolOutput: null,
        toolResponseMetadata: null,
      };
      vi.stubGlobal("openai", OpenaiMock);
      vi.stubGlobal("skybridge", { hostType: "apps-sdk" });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.resetAllMocks();
    });

    it("should return toolInput on initial mount window.openai", () => {
      const { result } = renderHook(() => useToolInfo());

      expect(result.current).toMatchObject({
        input: { name: "pokemon", args: { name: "pikachu" } },
        status: "pending",
        isIdle: false,
        isPending: true,
        isSuccess: false,
      });
    });

    it("should eventually return tool output and response metadata once tool call completes", async () => {
      const toolOutput = {
        name: "pikachu",
        color: "yellow",
        description:
          "When several of these POKéMON gather, their\felectricity could build and cause lightning storms.",
      };
      const toolResponseMetadata = { id: 12 };
      const { result } = renderHook(() => useToolInfo());

      act(() => {
        OpenaiMock.toolOutput = toolOutput;
        OpenaiMock.toolResponseMetadata = toolResponseMetadata;
        fireEvent(
          window,
          new SetGlobalsEvent(SET_GLOBALS_EVENT_TYPE, {
            detail: {
              globals: {
                toolOutput,
                toolResponseMetadata,
              },
            },
          }),
        );
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
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.resetAllMocks();
      McpAppBridge.resetInstance();
      McpAppAdapter.resetInstance();
    });

    it("should return idle state initially when tool input is not yet set", async () => {
      const { result } = renderHook(() => useToolInfo());

      await waitFor(() => {
        expect(result.current).toMatchObject({
          status: "idle",
          isIdle: true,
          isPending: false,
          isSuccess: false,
          input: null,
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
