import type {
  McpUiHostContext,
  McpUiInitializedNotification,
  McpUiInitializeRequest,
  McpUiInitializeResult,
  McpUiToolCancelledNotification,
  McpUiToolInputNotification,
  McpUiToolResultNotification,
} from "@modelcontextprotocol/ext-apps";

type PendingRequest<T> = {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
  timeout: NodeJS.Timeout;
};

type McpAppInitializationOptions = Pick<
  McpUiInitializeRequest["params"],
  "appInfo"
>;

export type McpToolState = {
  input: McpUiToolInputNotification["params"] | null;
  result: McpUiToolResultNotification["params"] | null;
  cancelled: McpUiToolCancelledNotification["params"] | null;
};

export type McpAppBridgeContext = McpUiHostContext & McpToolState;

export type McpAppBridgeKey = keyof McpAppBridgeContext;

const LATEST_PROTOCOL_VERSION = "2025-11-21";

const isToolStateKey = (key: McpAppBridgeKey): key is keyof McpToolState =>
  key === "input" || key === "result" || key === "cancelled";

export class McpAppBridge {
  private static instance: McpAppBridge | null = null;
  public context: McpUiHostContext | null = null;
  public toolState: McpToolState = {
    input: null,
    result: null,
    cancelled: null,
  };
  private listeners = new Map<McpAppBridgeKey, Set<() => void>>();
  private pendingRequests = new Map<number, PendingRequest<unknown>>();
  private nextId = 1;
  private initialized: boolean;
  private appInitializationOptions: McpUiInitializeRequest["params"];
  private requestTimeout: number;

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

  public subscribe(key: McpAppBridgeKey): (onChange: () => void) => () => void;
  public subscribe(
    keys: readonly McpAppBridgeKey[],
  ): (onChange: () => void) => () => void;
  public subscribe(
    keyOrKeys: McpAppBridgeKey | readonly McpAppBridgeKey[],
  ): (onChange: () => void) => () => void {
    const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
    return (onChange: () => void) => {
      for (const key of keys) {
        this.listeners.set(
          key,
          new Set([...(this.listeners.get(key) || []), onChange]),
        );
      }
      this.init();
      return () => {
        for (const key of keys) {
          this.listeners.get(key)?.delete(onChange);
        }
      };
    };
  }

  public getSnapshot<K extends keyof McpToolState>(key: K): McpToolState[K];
  public getSnapshot<K extends keyof McpUiHostContext>(
    key: K,
  ): McpUiHostContext[K];
  public getSnapshot<K extends keyof McpAppBridgeContext>(
    key: K,
  ): McpAppBridgeContext[K] {
    if (isToolStateKey(key)) {
      return this.toolState[key];
    }
    return this.context?.[key];
  }

  public cleanup = () => {
    window.removeEventListener("message", this.handleMessage);
    this.pendingRequests.forEach((request) => {
      clearTimeout(request.timeout);
    });
    this.pendingRequests.clear();
    this.listeners.clear();
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

  private setContext(context: McpUiHostContext | null) {
    if (context == null) return;
    this.context = context;
    for (const key of Object.keys(context)) {
      this.emit(key);
    }
  }

  private init() {
    if (this.initialized) return;
    this.initialized = true;

    if (typeof window === "undefined" || window.parent === window) {
      return;
    }

    window.addEventListener("message", this.handleMessage);
    this.connect();
  }

  private handleMessage = (event: MessageEvent) => {
    const data = event.data;
    if (data?.jsonrpc !== "2.0") return;

    const request = this.pendingRequests.get(data.id);
    if (request) {
      clearTimeout(request.timeout);
      this.pendingRequests.delete(data.id);
      if (data.error) {
        request.reject(new Error(data.error.message));
        return;
      }

      request.resolve(data.result);
      return;
    }

    if (data.method === "ui/notifications/host-context-changed") {
      this.setContext({ ...this.context, ...data.params });
      return;
    }

    if (data.method === "ui/notifications/tool-input") {
      const params = data.params as McpUiToolInputNotification["params"];
      this.toolState = { ...this.toolState, input: params.arguments ?? null };
      this.emit("input");
      return;
    }

    if (data.method === "ui/notifications/tool-result") {
      const params = data.params as McpUiToolResultNotification["params"];
      this.toolState = { ...this.toolState, result: params };
      this.emit("result");
      return;
    }

    if (data.method === "ui/notifications/tool-cancelled") {
      const params = data.params as McpUiToolCancelledNotification["params"];
      this.toolState = { ...this.toolState, cancelled: params };
      this.emit("cancelled");
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

      this.setContext(result.hostContext);
      this.notify({ method: "ui/notifications/initialized" });
    } catch (err) {
      console.error(err);
    }
  }

  private notify(notification: McpUiInitializedNotification) {
    window.parent.postMessage({ jsonrpc: "2.0", ...notification }, "*");
  }
}
