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
import { dequal } from "dequal/lite";
import {
  McpAppBridge,
  type McpAppBridgeContext,
  type McpAppBridgeKey,
} from "./mcp-app-bridge.js";
import type {
  Adapter,
  BridgeInterface,
  CallToolResponse,
  DisplayMode,
  ExternalStore,
} from "./types.js";

type PickContext<K extends readonly McpAppBridgeKey[]> = {
  [P in K[number]]: McpAppBridgeContext[P];
};

export class McpAppAdapter implements Adapter {
  private static instance: McpAppAdapter | null = null;
  private stores: {
    [K in keyof BridgeInterface]: ExternalStore<K>;
  };
  private constructor() {
    this.stores = this.initializeStores();
  }

  public static getInstance(): McpAppAdapter {
    if (!McpAppAdapter.instance) {
      McpAppAdapter.instance = new McpAppAdapter();
    }
    return McpAppAdapter.instance;
  }

  public static resetInstance(): void {
    McpAppAdapter.instance = null;
  }

  public getExternalStore<K extends keyof BridgeInterface>(
    key: K,
  ): ExternalStore<K> {
    return this.stores[key];
  }

  public callTool = async <
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

  public requestDisplayMode = (mode: DisplayMode) => {
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

  public sendFollowUpMessage = async (prompt: string) => {
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

  private initializeStores(): {
    [K in keyof BridgeInterface]: ExternalStore<K>;
  } {
    return {
      theme: this.createExternalStore(
        ["theme"],
        ({ theme }) => theme ?? "light",
      ),
      locale: this.createExternalStore(
        ["locale"],
        ({ locale }) => locale ?? "en-US",
      ),
      safeArea: this.createExternalStore(
        ["safeAreaInsets"],
        ({ safeAreaInsets }) => ({
          insets: safeAreaInsets ?? { top: 0, right: 0, bottom: 0, left: 0 },
        }),
      ),
      displayMode: this.createExternalStore(
        ["displayMode"],
        ({ displayMode }) => displayMode ?? "inline",
      ),
      maxHeight: this.createExternalStore(
        ["viewport"],
        ({ viewport }) => viewport?.maxHeight ?? window.innerHeight,
      ),
      userAgent: this.createExternalStore(
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
      toolInput: this.createExternalStore(
        ["toolInput"],
        ({ toolInput }) => toolInput ?? null,
      ),
      toolOutput: this.createExternalStore(
        ["toolResult"],
        ({ toolResult }) => toolResult?.structuredContent ?? null,
      ),
      toolResponseMetadata: this.createExternalStore(
        ["toolResult"],
        ({ toolResult }) => toolResult?._meta ?? null,
      ),
    };
  }

  private createExternalStore<const Keys extends readonly McpAppBridgeKey[], R>(
    keys: Keys,
    computeSnapshot: (context: PickContext<Keys>) => R,
  ) {
    const bridge = McpAppBridge.getInstance();
    let cachedValue: R | undefined;

    return {
      subscribe: bridge.subscribe(keys),
      getSnapshot: () => {
        const context = Object.fromEntries(
          keys.map((k) => [k, bridge.getSnapshot(k)]),
        ) as PickContext<Keys>;
        const newValue = computeSnapshot(context);

        if (cachedValue !== undefined && dequal(cachedValue, newValue)) {
          return cachedValue;
        }

        cachedValue = newValue;
        return newValue;
      },
    };
  }
}
