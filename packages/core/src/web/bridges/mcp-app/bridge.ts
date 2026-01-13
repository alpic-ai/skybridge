import type {
  McpUiHostContext,
  McpUiHostContextChangedNotification,
  McpUiInitializedNotification,
  McpUiInitializeRequest,
  McpUiInitializeResult,
  McpUiResourceTeardownRequest,
  McpUiResourceTeardownResult,
  McpUiSizeChangedNotification,
  McpUiToolCancelledNotification,
  McpUiToolInputNotification,
  McpUiToolResultNotification,
} from "@modelcontextprotocol/ext-apps";
import type { Bridge, Subscribe } from "../types.js";
import type { McpAppBridgeContext, McpAppBridgeKey } from "./types.js";

type PendingRequest<T> = {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
  timeout: NodeJS.Timeout;
};

type McpAppInitializationOptions = Pick<
  McpUiInitializeRequest["params"],
  "appInfo"
>;

const LATEST_PROTOCOL_VERSION = "2025-11-21";

enum JsonRpcErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
}

type McpAppResponse = {
  jsonrpc: "2.0";
  id: string | number;
} & (
  | {
      result: unknown;
    }
  | {
      error: { code: JsonRpcErrorCode; message: string };
    }
);

type McpAppRequest = {
  jsonrpc: "2.0";
  id: string | number;
} & McpUiResourceTeardownRequest;

type McpAppNotification = { jsonrpc: "2.0" } & (
  | McpUiToolInputNotification
  | McpUiToolResultNotification
  | McpUiToolCancelledNotification
  | McpUiHostContextChangedNotification
);

export class McpAppBridge implements Bridge<McpUiHostContext> {
  private static instance: McpAppBridge | null = null;
  public context: McpAppBridgeContext = {
    toolInput: null,
    toolCancelled: null,
    toolResult: null,
  };
  private listeners = new Map<McpAppBridgeKey, Set<() => void>>();
  private pendingRequests = new Map<string | number, PendingRequest<unknown>>();
  private nextId = 1;
  private initialized: boolean;
  private appInitializationOptions: McpUiInitializeRequest["params"];
  private requestTimeout: number;
  private cleanupSizeObserver: (() => void) | null = null;

  constructor(
    options: McpAppInitializationOptions,
    requestTimeout: number = 10_000,
  ) {
    this.requestTimeout = requestTimeout;
    this.initialized = false;
    this.appInitializationOptions = {
      appInfo: options.appInfo,
      appCapabilities: {},
      protocolVersion: LATEST_PROTOCOL_VERSION,
    };
    this.init();
  }

  public static getInstance(
    options?: Partial<McpAppInitializationOptions>,
    requestTimeout?: number,
  ): McpAppBridge {
    if (window.skybridge.hostType !== "mcp-app") {
      throw new Error("MCP App Bridge can only be used in the mcp-app runtime");
    }
    if (McpAppBridge.instance && (options || requestTimeout)) {
      console.warn(
        "McpAppBridge.getInstance: options and requestTimeout ignored, instance already exists",
      );
    }
    if (!McpAppBridge.instance) {
      const defaultOptions: McpAppInitializationOptions = {
        appInfo: { name: "skybridge-app", version: "0.0.1" },
      };
      McpAppBridge.instance = new McpAppBridge(
        { ...defaultOptions, ...options },
        requestTimeout,
      );
    }
    return McpAppBridge.instance;
  }

  public subscribe(key: McpAppBridgeKey): Subscribe;
  public subscribe(keys: readonly McpAppBridgeKey[]): Subscribe;
  public subscribe(
    keyOrKeys: McpAppBridgeKey | readonly McpAppBridgeKey[],
  ): Subscribe {
    const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
    return (onChange: () => void) => {
      for (const key of keys) {
        this.listeners.set(
          key,
          new Set([...(this.listeners.get(key) || []), onChange]),
        );
      }
      return () => {
        for (const key of keys) {
          this.listeners.get(key)?.delete(onChange);
        }
      };
    };
  }

  public getSnapshot<K extends keyof McpAppBridgeContext>(
    key: K,
  ): McpAppBridgeContext[K] {
    return this.context[key];
  }

  public cleanup = () => {
    window.removeEventListener("message", this.handleMessage);
    this.pendingRequests.forEach((request) => {
      clearTimeout(request.timeout);
    });
    this.pendingRequests.clear();
    this.listeners.clear();
    this.cleanupSizeObserver?.();
    this.cleanupSizeObserver = null;
  };

  public static resetInstance(): void {
    if (McpAppBridge.instance) {
      McpAppBridge.instance.cleanup();
      McpAppBridge.instance = null;
    }
  }

  public request<R extends { method: string; params?: unknown }, T>({
    method,
    params,
  }: R): Promise<T> {
    const id = this.nextId++;
    const { promise, resolve, reject } = Promise.withResolvers<T>();
    this.pendingRequests.set(id, {
      resolve: resolve as (value: unknown) => void,
      reject,
      timeout: setTimeout(() => {
        reject(new Error("Request timed out"));
        this.pendingRequests.delete(id);
      }, this.requestTimeout),
    });
    window.parent.postMessage({ jsonrpc: "2.0", id, method, params }, "*");

    return promise;
  }

  private emit(key: McpAppBridgeKey) {
    this.listeners.get(key)?.forEach((listener) => {
      listener();
    });
  }

  private updateContext(context: Partial<McpAppBridgeContext>) {
    this.context = { ...this.context, ...context };
    for (const key of Object.keys(context)) {
      this.emit(key);
    }
  }

  private init() {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    if (typeof window === "undefined" || window.parent === window) {
      return;
    }

    window.addEventListener("message", this.handleMessage);
    this.connect();
  }

  private handleMessage = (
    event: MessageEvent<McpAppResponse | McpAppNotification | McpAppRequest>,
  ) => {
    const data = event.data;
    if (data.jsonrpc !== "2.0") {
      return;
    }

    if ("id" in data) {
      if ("method" in data) {
        this.handleRequest(data);
        return;
      }

      this.handleResponse(data);
      return;
    }

    this.handleNotification(data);
  };

  private handleResponse(response: McpAppResponse) {
    const request = this.pendingRequests.get(response.id);
    if (request) {
      clearTimeout(request.timeout);
      this.pendingRequests.delete(response.id);
      if ("error" in response) {
        request.reject(new Error(response.error.message));
        return;
      }

      request.resolve(response.result);
    }
  }

  private handleNotification = (notification: McpAppNotification) => {
    switch (notification.method) {
      case "ui/notifications/host-context-changed":
        this.updateContext(notification.params);
        return;
      case "ui/notifications/tool-input":
        this.updateContext({
          toolInput: notification.params.arguments ?? {},
        });
        return;
      case "ui/notifications/tool-result":
        this.updateContext({
          toolResult: notification.params,
        });
        return;
      case "ui/notifications/tool-cancelled":
        this.updateContext({
          toolCancelled: notification.params,
        });
        return;
    }
  };

  private handleRequest = (request: McpAppRequest) => {
    switch (request.method) {
      case "ui/resource-teardown":
        this.cleanup();
        window.parent.postMessage(
          {
            jsonrpc: "2.0",
            id: request.id,
            result: {} satisfies McpUiResourceTeardownResult,
          } satisfies McpAppResponse,
          "*",
        );
        return;
      default:
        window.parent.postMessage(
          {
            jsonrpc: "2.0",
            id: request.id,
            error: {
              code: JsonRpcErrorCode.MethodNotFound,
              message: "Unsupported Request",
            },
          } satisfies McpAppResponse,
          "*",
        );
    }
  };

  private async connect() {
    try {
      const result = await this.request<
        McpUiInitializeRequest,
        McpUiInitializeResult
      >({
        method: "ui/initialize",
        params: this.appInitializationOptions,
      });

      this.updateContext(result.hostContext);
      this.notify({ method: "ui/notifications/initialized" });
      this.cleanupSizeObserver = this.setupSizeChangedNotifications();
    } catch (err) {
      console.error(err);
    }
  }

  private notify(
    notification: McpUiInitializedNotification | McpUiSizeChangedNotification,
  ) {
    window.parent.postMessage({ jsonrpc: "2.0", ...notification }, "*");
  }

  private sendSizeChanged(params: McpUiSizeChangedNotification["params"]) {
    this.notify({ method: "ui/notifications/size-changed", params });
  }

  /**
   * Set up automatic size change notifications using ResizeObserver.
   * Based on @modelcontextprotocol/ext-apps App.setupSizeChangedNotifications
   * @see https://github.com/modelcontextprotocol/ext-apps/blob/main/src/app.ts#L940-L989
   */
  private setupSizeChangedNotifications(): () => void {
    let scheduled = false;
    let lastWidth = 0;
    let lastHeight = 0;

    const sendBodySizeChanged = () => {
      if (scheduled) {
        return;
      }
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        const html = document.documentElement;

        // Measure actual content size by temporarily setting html to fit-content.
        // This shrinks html to fit body (including body margins), giving us the
        // true minimum size needed by the content.
        const originalWidth = html.style.width;
        const originalHeight = html.style.height;
        html.style.width = "fit-content";
        html.style.height = "fit-content";
        const rect = html.getBoundingClientRect();
        html.style.width = originalWidth;
        html.style.height = originalHeight;

        // Compensate for scrollbar width on Linux/Windows where scrollbars
        // consume space. On systems with overlay scrollbars (macOS), this
        // will be 0.
        const scrollbarWidth = window.innerWidth - html.clientWidth;

        const width = Math.ceil(rect.width + scrollbarWidth);
        const height = Math.ceil(rect.height);

        // Only send if size actually changed (prevents feedback loops from
        // style changes)
        if (width !== lastWidth || height !== lastHeight) {
          lastWidth = width;
          lastHeight = height;
          this.sendSizeChanged({ width, height });
        }
      });
    };

    sendBodySizeChanged();

    const resizeObserver = new ResizeObserver(sendBodySizeChanged);
    resizeObserver.observe(document.documentElement);
    resizeObserver.observe(document.body);

    return () => resizeObserver.disconnect();
  }
}
