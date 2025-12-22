import { useSyncExternalStore } from "react";
import {
  LATEST_PROTOCOL_VERSION,
  type McpUiHostContext,
  type McpUiInitializedNotification,
  type McpUiInitializeRequest,
  type McpUiInitializeResult,
} from "../types/ext-apps.js";

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
  private listeners = new Set<() => void>();
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

  subscribe = (onChange: () => void) => {
    this.listeners.add(onChange);
    this.init();
    return () => this.listeners.delete(onChange);
  };

  public cleanup() {
    window.removeEventListener("message", this.handleMessage);
    this.pendingRequests.clear();
  }

  private request<R extends { method: string; params?: unknown }, T>({
    method,
    params,
  }: R): Promise<T> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      window.parent.postMessage({ jsonrpc: "2.0", id, method, params }, "*");
    });
  }

  private emit() {
    this.listeners.forEach((l) => {
      l();
    });
  }

  private setContext(context: McpUiHostContext | null) {
    if (context !== undefined) this.context = context;
    this.emit();
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

  return useSyncExternalStore(host.subscribe, () => host.context?.[key]);
}
