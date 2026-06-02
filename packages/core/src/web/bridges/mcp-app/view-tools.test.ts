import { waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as z from "zod";
import { MockResizeObserver } from "../../hooks/test/utils.js";
import { McpAppAdaptor } from "./adaptor.js";
import { McpAppBridge } from "./bridge.js";

type JsonRpcMessage = {
  jsonrpc: "2.0";
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: { message: string };
};

const outgoing: JsonRpcMessage[] = [];

/**
 * Stand-in MCP Apps host: replies to `ui/initialize` and records every message
 * the app posts so tests can assert on responses and notifications.
 */
function installHostMock() {
  outgoing.length = 0;
  const postMessage = vi.fn((message: JsonRpcMessage) => {
    outgoing.push(message);
    if (message.method === "ui/initialize" && message.id !== undefined) {
      act(() => {
        window.dispatchEvent(
          new MessageEvent("message", {
            source: window.parent,
            data: {
              jsonrpc: "2.0",
              id: message.id,
              result: {
                protocolVersion: "2025-06-18",
                hostInfo: { name: "test-host", version: "1.0.0" },
                hostCapabilities: {},
                hostContext: {},
              },
            },
          }),
        );
      });
    }
  });
  vi.stubGlobal("parent", { postMessage });
}

let nextId = 1000;

/** Send a host → app JSON-RPC request and resolve with the full response (result or error). */
async function callHost(method: string, params: Record<string, unknown> = {}) {
  const id = ++nextId;
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        source: window.parent,
        data: { jsonrpc: "2.0", id, method, params },
      }),
    );
  });
  await waitFor(() => {
    expect(outgoing.some((m) => m.id === id)).toBe(true);
  });
  return outgoing.find((m) => m.id === id);
}

describe("McpApp view tools", () => {
  beforeEach(() => {
    vi.stubGlobal("skybridge", { hostType: "mcp-app" });
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    McpAppBridge.resetInstance();
    McpAppAdaptor.resetInstance();
    installHostMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("advertises the tools capability during ui/initialize", async () => {
    await McpAppBridge.getInstance().getApp();
    const init = outgoing.find((m) => m.method === "ui/initialize");
    expect(init?.params?.appCapabilities).toMatchObject({
      tools: { listChanged: true },
    });
  });

  it("lists a registered view tool with its input schema", async () => {
    const adaptor = McpAppAdaptor.getInstance();
    await McpAppBridge.getInstance().getApp();

    adaptor.registerViewTool(
      {
        name: "chess_make_move",
        description: "Play a move",
        inputSchema: { san: z.string() },
        annotations: { readOnlyHint: false },
      },
      () => ({ content: [{ type: "text", text: "ok" }] }),
    );

    const response = await callHost("tools/list");
    const tools = response?.result?.tools as Array<{
      name: string;
      description?: string;
      inputSchema: { properties?: Record<string, unknown> };
      annotations?: { readOnlyHint?: boolean };
    }>;
    expect(tools).toHaveLength(1);
    const [tool] = tools;
    expect(tool?.name).toBe("chess_make_move");
    expect(tool?.description).toBe("Play a move");
    expect(tool?.inputSchema.properties).toHaveProperty("san");
    expect(tool?.annotations?.readOnlyHint).toBe(false);
  });

  it("invokes the handler with validated args and returns its result", async () => {
    const adaptor = McpAppAdaptor.getInstance();
    await McpAppBridge.getInstance().getApp();

    const handler = vi.fn(({ san }: { san: string }) => ({
      content: [{ type: "text" as const, text: `played ${san}` }],
      structuredContent: { lastMove: san },
    }));

    adaptor.registerViewTool(
      { name: "chess_make_move", inputSchema: { san: z.string() } },
      handler as never,
    );

    const response = await callHost("tools/call", {
      name: "chess_make_move",
      arguments: { san: "e4" },
    });
    const result = response?.result;

    // ext-apps invokes the callback as `(args, extra)`; assert on the args only.
    expect(handler.mock.calls[0]?.[0]).toEqual({ san: "e4" });
    expect(result?.structuredContent).toEqual({ lastMove: "e4" });
    expect(result?.isError).toBeFalsy();
    expect(result?.content).toEqual([{ type: "text", text: "played e4" }]);
  });

  it("rejects the call without invoking the handler when args are invalid", async () => {
    const adaptor = McpAppAdaptor.getInstance();
    await McpAppBridge.getInstance().getApp();

    const handler = vi.fn(() => ({ content: [] }));
    adaptor.registerViewTool(
      { name: "chess_make_move", inputSchema: { san: z.string() } },
      handler as never,
    );

    // ext-apps validates input against the schema and rejects with a JSON-RPC
    // error before the handler runs.
    const response = await callHost("tools/call", {
      name: "chess_make_move",
      arguments: { san: 42 },
    });

    expect(handler).not.toHaveBeenCalled();
    expect(response?.error).toBeDefined();
  });

  it("rejects a call to an unknown tool", async () => {
    await McpAppBridge.getInstance().getApp();
    const response = await callHost("tools/call", {
      name: "nope",
      arguments: {},
    });
    expect(response?.error).toBeDefined();
  });

  it("removes the tool and notifies the host when unregistered", async () => {
    const adaptor = McpAppAdaptor.getInstance();
    await McpAppBridge.getInstance().getApp();

    const unregister = adaptor.registerViewTool(
      { name: "chess_reset" },
      () => ({ content: [{ type: "text", text: "reset" }] }),
    );

    await waitFor(() => {
      expect(
        outgoing.some((m) => m.method === "notifications/tools/list_changed"),
      ).toBe(true);
    });

    let listed = await callHost("tools/list");
    expect(listed?.result?.tools).toHaveLength(1);

    unregister();
    listed = await callHost("tools/list");
    expect(listed?.result?.tools).toHaveLength(0);
  });
});
