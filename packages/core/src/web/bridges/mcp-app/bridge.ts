import { App } from "@modelcontextprotocol/ext-apps";
import {
  type Implementation,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { dequal } from "dequal/lite";
import * as z from "zod";
import type {
  AnyViewToolHandler,
  Bridge,
  HostContextStore,
  Subscribe,
  ViewToolConfig,
} from "../types.js";
import type { McpAppContext, McpAppContextKey } from "./types.js";

type PickContext<K extends readonly McpAppContextKey[]> = {
  [P in K[number]]: McpAppContext[P];
};

function createMcpStore<const Keys extends readonly McpAppContextKey[], R>(
  bridge: McpAppBridge,
  keys: Keys,
  computeSnapshot: (context: PickContext<Keys>) => R,
) {
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

/** @internal Singleton bridge over the `ext-apps` JSON-RPC App connection. Used by `HostAdaptor`. */
export class McpAppBridge implements Bridge<McpAppContext> {
  private static instance: McpAppBridge | null = null;
  public context: McpAppContext = {
    toolInput: null,
    toolCancelled: null,
    toolResult: null,
  };
  private listeners = new Map<McpAppContextKey, Set<() => void>>();
  private app: App;
  private connectPromise: Promise<void>;

  constructor(options: { appInfo: Implementation }) {
    this.app = new App(options.appInfo, { tools: { listChanged: true } });

    this.app.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [],
    }));

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

    this.connectPromise = this.connect();
  }

  private async connect() {
    try {
      await this.app.connect();
      const hostContext = this.app.getHostContext();
      const hostInfo = this.app.getHostVersion();
      if (hostInfo) {
        this.updateContext({ hostInfo });
      }
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

  public registerViewTool(
    config: ViewToolConfig,
    handler: AnyViewToolHandler,
  ): () => void {
    const inputSchema = config.inputSchema
      ? z.object(config.inputSchema)
      : z.object({});

    const registered = this.app.registerTool(
      config.name,
      {
        ...(config.title !== undefined ? { title: config.title } : {}),
        ...(config.description !== undefined
          ? { description: config.description }
          : {}),
        inputSchema,
        ...(config.annotations ? { annotations: config.annotations } : {}),
      },
      handler,
    );

    return () => {
      registered.remove();
    };
  }

  public static getInstance(
    options?: Partial<{ appInfo: Implementation }>,
  ): McpAppBridge {
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

  public createContextStores(): {
    theme: HostContextStore<"theme">;
    locale: HostContextStore<"locale">;
    safeArea: HostContextStore<"safeArea">;
    displayMode: HostContextStore<"displayMode">;
    maxHeight: HostContextStore<"maxHeight">;
    userAgent: HostContextStore<"userAgent">;
    toolInput: HostContextStore<"toolInput">;
    toolOutput: HostContextStore<"toolOutput">;
    toolResponseMetadata: HostContextStore<"toolResponseMetadata">;
  } {
    return {
      theme: createMcpStore(this, ["theme"], ({ theme }) => theme ?? "light"),
      locale: createMcpStore(
        this,
        ["locale"],
        ({ locale }) => locale ?? "en-US",
      ),
      safeArea: createMcpStore(
        this,
        ["safeAreaInsets"],
        ({ safeAreaInsets }) => ({
          insets: safeAreaInsets ?? { top: 0, right: 0, bottom: 0, left: 0 },
        }),
      ),
      displayMode: createMcpStore(
        this,
        ["displayMode"],
        ({ displayMode }) => displayMode ?? "inline",
      ),
      maxHeight: createMcpStore(
        this,
        ["containerDimensions"],
        ({ containerDimensions }) => {
          if (containerDimensions && "maxHeight" in containerDimensions) {
            return containerDimensions.maxHeight;
          }
          return undefined;
        },
      ),
      userAgent: createMcpStore(
        this,
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
      toolInput: createMcpStore(
        this,
        ["toolInput"],
        ({ toolInput }) => toolInput ?? null,
      ),
      toolOutput: createMcpStore(
        this,
        ["toolResult"],
        ({ toolResult }) => toolResult?.structuredContent ?? null,
      ),
      toolResponseMetadata: createMcpStore(
        this,
        ["toolResult"],
        ({ toolResult }) => toolResult?._meta ?? null,
      ),
    };
  }

  public cleanup = () => {
    this.listeners.clear();
  };

  public static resetInstance(): void {
    if (McpAppBridge.instance) {
      McpAppBridge.instance.cleanup();
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
