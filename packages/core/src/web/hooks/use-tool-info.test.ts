import type {
  McpUiToolInputNotification,
  McpUiToolResultNotification,
} from "@modelcontextprotocol/ext-apps";
import { act, fireEvent, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { McpAppBridge } from "../bridges/mcp-app-bridge.js";
import {
  type OpenAiProperties,
  SET_GLOBALS_EVENT_TYPE,
  SetGlobalsEvent,
} from "../types.js";
import { MCPAppHostPostMessageMock } from "./test/utils.js";
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
          isPending: false,
          isSuccess: true,
          output: toolOutput,
          responseMetadata: toolResponseMetadata,
        });
      });
    });
  });

  describe("mcp-app host", () => {
    const mockPostMessage = MCPAppHostPostMessageMock;

    beforeEach(() => {
      vi.stubGlobal("parent", {
        value: { postMessage: mockPostMessage },
        writable: true,
        configurable: true,
      });
      vi.stubGlobal("skybridge", { hostType: "mcp-app" });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.resetAllMocks();
      McpAppBridge.resetInstance();
    });

    it("should return pending state initially", async () => {
      const { result } = renderHook(() => useToolInfo());

      await waitFor(() => {
        expect(result.current).toMatchObject({
          status: "pending",
          isPending: true,
          isSuccess: false,
          input: {},
          output: null,
          responseMetadata: null,
        });
      });
    });

    it("should return tool input from tool-input notification", async () => {
      const { result } = renderHook(() => useToolInfo());

      act(() => {
        fireEvent(
          window,
          new MessageEvent<McpUiToolInputNotification & { jsonrpc: "2.0" }>(
            "message",
            {
              data: {
                jsonrpc: "2.0",
                method: "ui/notifications/tool-input",
                params: {
                  arguments: { name: "pokemon", query: "pikachu" },
                },
              },
            },
          ),
        );
      });

      await waitFor(() => {
        expect(result.current).toMatchObject({
          status: "pending",
          isPending: true,
          isSuccess: false,
          input: { name: "pokemon", query: "pikachu" },
        });
      });
    });

    it("should return success state with output from tool-result notification", async () => {
      const { result } = renderHook(() => useToolInfo());

      act(() => {
        fireEvent(
          window,
          new MessageEvent<McpUiToolResultNotification & { jsonrpc: "2.0" }>(
            "message",
            {
              data: {
                jsonrpc: "2.0",
                method: "ui/notifications/tool-result",
                params: {
                  content: [{ type: "text", text: "Pikachu data" }],
                  structuredContent: { name: "pikachu", color: "yellow" },
                  _meta: { requestId: "123" },
                },
              },
            },
          ),
        );
      });

      await waitFor(() => {
        expect(result.current).toMatchObject({
          status: "success",
          isPending: false,
          isSuccess: true,
          output: { name: "pikachu", color: "yellow" },
          responseMetadata: { requestId: "123" },
        });
      });
    });
  });
});
