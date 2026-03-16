import { App, PostMessageTransport } from "@modelcontextprotocol/ext-apps";
import type { Implementation } from "@modelcontextprotocol/sdk/types.js";
import type { Bridge, Subscribe } from "../types.js";
import type { McpAppContext, McpAppContextKey } from "./types.js";

export class McpAppBridge implements Bridge<McpAppContext> {
  private static instance: McpAppBridge | null = null;
  public context: McpAppContext = {
    toolInput: null,
    toolCancelled: null,
    toolResult: null,
  };
  private listeners = new Map<McpAppContextKey, Set<() => void>>();
  private app: App;
  private transport: PostMessageTransport;
  private connectPromise: Promise<void>;

  constructor(options: { appInfo: Implementation }) {
    this.app = new App(options.appInfo);
    this.transport = new PostMessageTransport(window.parent, window.parent);

    this.app.ontoolinput = (params) => {
      this.updateContext({ toolInput: params.arguments ?? {} });
    };

    this.app.ontoolinputpartial = (params) => {
      this.updateContext({ toolInput: params.arguments ?? {} });
    };

    this.app.ontoolresult = (params) => {
      this.updateContext({ toolResult: params });
    };

    this.app.ontoolcancelled = (params) => {
      this.updateContext({ toolCancelled: params });
    };

    this.app.onhostcontextchanged = (params) => {
      this.updateContext(params);
    };

    this.app.onteardown = () => {
      this.cleanup();
      return {};
    };

    this.connectPromise = this.connect();
  }

  private async connect() {
    try {
      await this.app.connect(this.transport);
      const hostContext = this.app.getHostContext();
      if (hostContext) {
        this.updateContext(hostContext);
      }
    } catch (err) {
      console.error(err);
    }
  }

  public async getApp(): Promise<App> {
    await this.connectPromise;
    return this.app;
  }

  public static getInstance(
    options?: Partial<{ appInfo: Implementation }>,
  ): McpAppBridge {
    if (window.skybridge.hostType !== "mcp-app") {
      throw new Error("MCP App Bridge can only be used in the mcp-app runtime");
    }
    if (McpAppBridge.instance && options) {
      console.warn(
        "McpAppBridge.getInstance: options ignored, instance already exists",
      );
    }
    if (!McpAppBridge.instance) {
      const defaultOptions = {
        appInfo: { name: "skybridge-app", version: "0.0.1" },
      };
      McpAppBridge.instance = new McpAppBridge({
        ...defaultOptions,
        ...options,
      });
    }
    return McpAppBridge.instance;
  }

  public subscribe(key: McpAppContextKey): Subscribe;
  public subscribe(keys: readonly McpAppContextKey[]): Subscribe;
  public subscribe(
    keyOrKeys: McpAppContextKey | readonly McpAppContextKey[],
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

  public getSnapshot<K extends keyof McpAppContext>(key: K): McpAppContext[K] {
    return this.context[key];
  }

  public cleanup = async () => {
    this.listeners.clear();
    // Neutralize sendSizeChanged so any pending requestAnimationFrame callbacks
    // from the SDK's auto-resize become no-ops after close.
    this.app.sendSizeChanged = () => Promise.resolve();
    await this.app.close().catch(() => {});
  };

  public static async resetInstance(): Promise<void> {
    if (McpAppBridge.instance) {
      await McpAppBridge.instance.cleanup();
      McpAppBridge.instance = null;
    }
  }

  private emit(key: McpAppContextKey) {
    this.listeners.get(key)?.forEach((listener) => {
      listener();
    });
  }

  private updateContext(context: Partial<McpAppContext>) {
    this.context = { ...this.context, ...context };
    for (const key of Object.keys(context)) {
      this.emit(key);
    }
  }
}
