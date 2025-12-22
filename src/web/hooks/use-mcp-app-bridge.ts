import {
  LATEST_PROTOCOL_VERSION,
  type McpUiHostContext,
  type McpUiInitializedNotification,
  type McpUiInitializeRequest,
  type McpUiInitializeResult,
} from "@modelcontextprotocol/ext-apps";

import { useSyncExternalStore } from "react";

type PendingRequest<T> = {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

type McpAppInitializationOptions = Pick<
  McpUiInitializeRequest["params"],
  "appInfo"
>;

export class McpAppBridge {
  public context: McpUiHostContext | null = null;
  private listeners = new Map<keyof McpUiHostContext, Set<() => void>>();
  private pendingRequests = new Map<number, PendingRequest<unknown>>();
  private nextId = 1;
  private initialized: boolean;
  private appInitializationOptions: McpUiInitializeRequest["params"];

  constructor(options: McpAppInitializationOptions) {
    this.initialized = false;
    this.appInitializationOptions = {
      appInfo: options.appInfo,
      appCapabilities: {},
      protocolVersion: LATEST_PROTOCOL_VERSION,
    };
  }

  subscribe = (key: keyof McpUiHostContext) => (onChange: () => void) => {
    this.listeners.set(
      key,
      new Set([...(this.listeners.get(key) || []), onChange]),
    );
    this.init();
    return () => this.listeners.get(key)?.delete(onChange);
  };

  public cleanup() {
    window.removeEventListener("message", this.handleMessage);
    this.pendingRequests.clear();
    this.listeners.clear();
  }

  private request<R extends { method: string; params?: unknown }, T>({
    method,
    params,
  }: R): Promise<T> {
    const id = this.nextId++;
    const { promise, resolve, reject } = Promise.withResolvers<T>();
    this.pendingRequests.set(id, {
      resolve: resolve as (value: unknown) => void,
      reject,
    });
    window.parent.postMessage({ jsonrpc: "2.0", id, method, params }, "*");
    return promise;
  }

  private emit(key: keyof McpUiHostContext) {
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

let instance: McpAppBridge | null = null;

const defaultOptions: McpAppInitializationOptions = {
  appInfo: { name: "skybridge-app", version: "0.0.1" },
};

export function getMcpHost(
  options?: Partial<McpAppInitializationOptions>,
): McpAppBridge {
  if (instance && options) {
    console.warn("getMcpHost: options ignored, instance already exists");
  }
  if (!instance) {
    instance = new McpAppBridge({ ...defaultOptions, ...options });
  }

  return instance;
}

export function useMcpAppBridge<K extends keyof McpUiHostContext>(
  key: K,
  options?: Partial<McpAppInitializationOptions>,
): McpUiHostContext[K] | undefined {
  const host = getMcpHost(options);

  return useSyncExternalStore(host.subscribe(key), () => host.context?.[key]);
}
