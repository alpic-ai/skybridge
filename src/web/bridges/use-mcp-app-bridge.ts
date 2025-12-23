import type {
  McpUiHostContext,
  McpUiInitializedNotification,
  McpUiInitializeRequest,
  McpUiInitializeResult,
} from "@modelcontextprotocol/ext-apps";

import { useSyncExternalStore } from "react";
import { NOOP_GET_SNAPSHOT, NOOP_SUBSCRIBE } from "./constants.js";

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

export class McpAppBridge {
  public context: McpUiHostContext | null = null;
  private listeners = new Map<keyof McpUiHostContext, Set<() => void>>();
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

  public subscribe =
    (key: keyof McpUiHostContext) => (onChange: () => void) => {
      this.listeners.set(
        key,
        new Set([...(this.listeners.get(key) || []), onChange]),
      );
      this.init();
      return () => this.listeners.get(key)?.delete(onChange);
    };

  public getSnapshot = <K extends keyof McpUiHostContext>(key: K) => {
    return this.context?.[key];
  };

  public cleanup = () => {
    window.removeEventListener("message", this.handleMessage);
    this.pendingRequests.forEach((request) => {
      clearTimeout(request.timeout);
    });
    this.pendingRequests.clear();
    this.listeners.clear();
  };

  private request<R extends { method: string; params?: unknown }, T>({
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

export function getMcpAppBridge(
  options?: Partial<McpAppInitializationOptions>,
  requestTimeout?: number,
): McpAppBridge {
  if (instance && (options || requestTimeout)) {
    console.warn(
      "getMcpAppBridge: options and requestTimeout ignored, instance already exists",
    );
  }
  if (!instance) {
    instance = new McpAppBridge(
      { ...defaultOptions, ...options },
      requestTimeout,
    );
  }

  return instance;
}

export function useMcpAppBridge<K extends keyof McpUiHostContext>(
  key: K,
  options?: Partial<McpAppInitializationOptions>,
  requestTimeout?: number,
): McpUiHostContext[K] | undefined {
  const hostType = window.skybridge.hostType;
  const bridge =
    hostType === "mcp-app" ? getMcpAppBridge(options, requestTimeout) : null;
  return useSyncExternalStore(
    bridge ? bridge.subscribe(key) : NOOP_SUBSCRIBE,
    bridge ? () => bridge.getSnapshot(key) : NOOP_GET_SNAPSHOT,
  );
}
