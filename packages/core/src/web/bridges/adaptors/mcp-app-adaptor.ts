import type {
  McpUiMessageRequest,
  McpUiMessageResult,
  McpUiOpenLinkRequest,
  McpUiOpenLinkResult,
  McpUiRequestDisplayModeRequest,
  McpUiRequestDisplayModeResult,
  McpUiUpdateModelContextRequest,
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
} from "../mcp-app-bridge.js";
import type {
  Adaptor,
  BridgeInterface,
  CallToolResponse,
  DisplayMode,
  ExternalStore,
  SetWidgetStateAction,
} from "../types.js";

type PickContext<K extends readonly McpAppBridgeKey[]> = {
  [P in K[number]]: McpAppBridgeContext[P];
};

export class McpAppAdaptor implements Adaptor {
  private static instance: McpAppAdaptor | null = null;
  private stores: {
    [K in keyof BridgeInterface]: ExternalStore<K>;
  };
  private _widgetState: BridgeInterface["widgetState"] = null;
  private widgetStateListeners = new Set<() => void>();

  private constructor() {
    this.stores = this.initializeStores();
  }

  public static getInstance(): McpAppAdaptor {
    if (!McpAppAdaptor.instance) {
      McpAppAdaptor.instance = new McpAppAdaptor();
    }
    return McpAppAdaptor.instance;
  }

  public static resetInstance(): void {
    McpAppAdaptor.instance = null;
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

  public openExternal(href: string): void {
    const bridge = McpAppBridge.getInstance();
    bridge.request<McpUiOpenLinkRequest, McpUiOpenLinkResult>({
      method: "ui/open-link",
      params: { url: href },
    });
  }

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
        ["containerDimensions"],
        ({ containerDimensions }) => {
          if (containerDimensions && "maxHeight" in containerDimensions) {
            return containerDimensions.maxHeight ?? window.innerHeight;
          }

          return window.innerHeight;
        },
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
      widgetState: {
        subscribe: (onChange: () => void) => {
          this.widgetStateListeners.add(onChange);
          return () => {
            this.widgetStateListeners.delete(onChange);
          };
        },
        getSnapshot: () => this._widgetState,
      },
    };
  }

  public setWidgetState = async (
    stateOrUpdater: SetWidgetStateAction,
  ): Promise<void> => {
    const newState =
      typeof stateOrUpdater === "function"
        ? stateOrUpdater(this._widgetState)
        : stateOrUpdater;

    const bridge = McpAppBridge.getInstance();
    await bridge.request<McpUiUpdateModelContextRequest, unknown>({
      method: "ui/update-model-context",
      params: { structuredContent: newState },
    });
    this._widgetState = newState;
    this.widgetStateListeners.forEach((listener) => {
      listener();
    });
  };

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
