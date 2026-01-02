import type {
  McpUiMessageRequest,
  McpUiMessageResult,
  McpUiRequestDisplayModeRequest,
  McpUiRequestDisplayModeResult,
} from "@modelcontextprotocol/ext-apps";
import type {
  CallToolRequest,
  CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";

import type { BridgeExternalStore } from "./hooks/types.js";
import {
  McpAppBridge,
  type McpAppBridgeContext,
  type McpAppBridgeKey,
} from "./mcp-app-bridge.js";
import type { BridgeInterface, CallToolResponse, Methods } from "./types.js";

export const callTool = async <
  ToolArgs extends Record<string, unknown> | null = null,
  ToolResponse extends CallToolResponse = CallToolResponse,
>(
  name: string,
  args: ToolArgs,
): Promise<ToolResponse> => {
  const bridge = McpAppBridge.getInstance();
  const response = await bridge.request<CallToolRequest, CallToolResult>({
    method: "tools/call",
    params: {
      name,
      arguments: args ?? undefined,
    },
  });

  const result = response.content
    .filter(
      (content): content is { type: "text"; text: string } =>
        content.type === "text",
    )
    .map(({ text }) => text)
    .join("\n");

  return {
    content: response.content,
    structuredContent: response.structuredContent ?? {},
    isError: response.isError ?? false,
    result,
    meta: response._meta ?? {},
  } as ToolResponse;
};

export const requestDisplayMode: Methods["requestDisplayMode"] = ({ mode }) => {
  const bridge = McpAppBridge.getInstance();
  if (mode !== "modal") {
    return bridge.request<
      McpUiRequestDisplayModeRequest,
      McpUiRequestDisplayModeResult
    >({
      method: "ui/request-display-mode",
      params: { mode },
    });
  }

  throw new Error("Modal display mode is not accessible in MCP App.");
};

export const sendFollowUpMessage: Methods["sendFollowUpMessage"] = async (
  prompt,
) => {
  const bridge = McpAppBridge.getInstance();
  await bridge.request<McpUiMessageRequest, McpUiMessageResult>({
    method: "ui/message",
    params: {
      role: "user",
      content: [
        {
          type: "text",
          text: prompt,
        },
      ],
    },
  });
};

type PickContext<K extends readonly McpAppBridgeKey[]> = {
  [P in K[number]]: McpAppBridgeContext[P];
};

const createExternalStore = <const Keys extends readonly McpAppBridgeKey[], R>(
  keys: Keys,
  getSnapshot: (context: PickContext<Keys>) => R,
) => {
  const bridge = McpAppBridge.getInstance();

  return {
    subscribe: bridge.subscribe(keys),
    getSnapshot: () => {
      const context = Object.fromEntries(
        keys.map((k) => [k, bridge.getSnapshot(k)]),
      ) as PickContext<Keys>;
      return getSnapshot(context);
    },
  };
};

const DEFAULT_TOOL_INPUT: Record<string, unknown> = {};

export const getMcpAppAdapter = (): {
  [K in keyof BridgeInterface]: BridgeExternalStore<K>;
} => ({
  theme: createExternalStore(["theme"], ({ theme }) => theme ?? "light"),
  locale: createExternalStore(["locale"], ({ locale }) => locale ?? "en-US"),
  safeArea: createExternalStore(["safeAreaInsets"], ({ safeAreaInsets }) => ({
    insets: safeAreaInsets ?? { top: 0, right: 0, bottom: 0, left: 0 },
  })),
  displayMode: createExternalStore(
    ["displayMode"],
    ({ displayMode }) => displayMode ?? "inline",
  ),
  maxHeight: createExternalStore(
    ["viewport"],
    ({ viewport }) => viewport?.maxHeight ?? window.innerHeight,
  ),
  userAgent: createExternalStore(
    ["platform", "deviceCapabilities"],
    ({ platform, deviceCapabilities }) => ({
      device: {
        type: platform === "web" ? "desktop" : (platform ?? "unknown"),
      },
      capabilities: {
        hover: true,
        touch: true,
        ...deviceCapabilities,
      },
    }),
  ),
  toolInput: createExternalStore(
    ["toolInput"],
    ({ toolInput }) => toolInput ?? DEFAULT_TOOL_INPUT,
  ),
  toolOutput: createExternalStore(
    ["toolResult"],
    ({ toolResult }) => toolResult?.structuredContent ?? null,
  ),
  toolResponseMetadata: createExternalStore(
    ["toolResult"],
    ({ toolResult }) => toolResult?._meta ?? null,
  ),
});
