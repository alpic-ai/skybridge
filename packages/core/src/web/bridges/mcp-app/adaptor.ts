import { dequal } from "dequal/lite";
import type {
  Adaptor,
  CallToolResponse,
  HostContext,
  HostContextStore,
  OpenExternalOptions,
  RequestDisplayMode,
  RequestModalOptions,
  SetWidgetStateAction,
} from "../types.js";
import { McpAppBridge } from "./bridge.js";
import type { McpAppContext, McpAppContextKey } from "./types.js";

type PickContext<K extends readonly McpAppContextKey[]> = {
  [P in K[number]]: McpAppContext[P];
};

export class McpAppAdaptor implements Adaptor {
  private static instance: McpAppAdaptor | null = null;
  private stores: {
    [K in keyof HostContext]: HostContextStore<K>;
  };
  private _widgetState: HostContext["widgetState"] = null;
  private widgetStateListeners = new Set<() => void>();
  private _viewUUID: string | null = null;

  private _viewState: HostContext["view"] = {
    mode: "inline",
  };
  private viewListeners = new Set<() => void>();

  private constructor() {
    this.stores = this.initializeStores();
    this.subscribeToViewUUID();
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

  public getHostContextStore<K extends keyof HostContext>(
    key: K,
  ): HostContextStore<K> {
    return this.stores[key];
  }

  public callTool = async <
    ToolArgs extends Record<string, unknown> | null = null,
    ToolResponse extends CallToolResponse = CallToolResponse,
  >(
    name: string,
    args: ToolArgs,
  ): Promise<ToolResponse> => {
    const app = await McpAppBridge.getInstance().getApp();
    const response = await app.callServerTool({
      name,
      arguments: args ?? undefined,
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

  public requestDisplayMode = async (mode: RequestDisplayMode) => {
    const app = await McpAppBridge.getInstance().getApp();
    return app.requestDisplayMode({ mode });
  };

  public sendFollowUpMessage = async (prompt: string) => {
    const app = await McpAppBridge.getInstance().getApp();
    await app.sendMessage({
      role: "user",
      content: [
        {
          type: "text",
          text: prompt,
        },
      ],
    });
  };

  public openExternal(href: string, options?: OpenExternalOptions): void {
    if (options?.redirectUrl === false) {
      console.warn(
        "[skybridge] redirectUrl option is not supported by the MCP ui/open-link protocol and will be ignored.",
      );
    }

    McpAppBridge.getInstance()
      .getApp()
      .then((app) => app.openLink({ url: href }))
      .catch((err) => {
        console.error("Failed to open external link:", err);
      });
  }

  private initializeStores(): {
    [K in keyof HostContext]: HostContextStore<K>;
  } {
    return {
      theme: this.createHostContextStore(
        ["theme"],
        ({ theme }) => theme ?? "light",
      ),
      locale: this.createHostContextStore(
        ["locale"],
        ({ locale }) => locale ?? "en-US",
      ),
      safeArea: this.createHostContextStore(
        ["safeAreaInsets"],
        ({ safeAreaInsets }) => ({
          insets: safeAreaInsets ?? { top: 0, right: 0, bottom: 0, left: 0 },
        }),
      ),
      displayMode: this.createHostContextStore(
        ["displayMode"],
        ({ displayMode }) => displayMode ?? "inline",
      ),
      maxHeight: this.createHostContextStore(
        ["containerDimensions"],
        ({ containerDimensions }) => {
          if (containerDimensions && "maxHeight" in containerDimensions) {
            return containerDimensions.maxHeight;
          }

          return undefined;
        },
      ),
      userAgent: this.createHostContextStore(
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
      toolInput: this.createHostContextStore(
        ["toolInput"],
        ({ toolInput }) => toolInput ?? null,
      ),
      toolOutput: this.createHostContextStore(
        ["toolResult"],
        ({ toolResult }) => toolResult?.structuredContent ?? null,
      ),
      toolResponseMetadata: this.createHostContextStore(
        ["toolResult"],
        ({ toolResult }) => toolResult?._meta ?? null,
      ),
      view: {
        subscribe: (onChange: () => void) => {
          this.viewListeners.add(onChange);
          return () => {
            this.viewListeners.delete(onChange);
          };
        },
        getSnapshot: () => this._viewState,
      },
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

    // must happen before the async bridge call to ensure the state is updated immediately for the UI,
    // otherwise successive calls to setWidgetState may have stale state
    this._widgetState = newState;
    this.widgetStateListeners.forEach((listener) => {
      listener();
    });

    this.persistToLocalStorage(newState);

    try {
      const app = await McpAppBridge.getInstance().getApp();
      await app.updateModelContext({
        structuredContent: newState,
        content: [{ type: "text", text: JSON.stringify(newState) }],
      });
    } catch (error) {
      console.error("Failed to update widget state in MCP App.", error);
    }
  };

  /**
   * @throws File upload is not supported in MCP App.
   */
  public uploadFile(): Promise<{ fileId: string }> {
    throw new Error("File upload is not supported in MCP App.");
  }

  /**
   * @throws File download is not supported in MCP App.
   */
  public getFileDownloadUrl(): Promise<{ downloadUrl: string }> {
    throw new Error("File download is not supported in MCP App.");
  }

  public openModal(options: RequestModalOptions) {
    this._viewState = { mode: "modal", params: options.params };
    this.viewListeners.forEach((listener) => {
      listener();
    });
  }

  public closeModal() {
    this._viewState = { mode: "inline" };
    this.viewListeners.forEach((listener) => {
      listener();
    });
  }

  public setOpenInAppUrl(_href: string): Promise<void> {
    throw new Error("setOpenInAppUrl is not implemented in MCP App.");
  }

  private subscribeToViewUUID(): void {
    const bridge = McpAppBridge.getInstance();
    bridge.subscribe("toolResult")(() => {
      const toolResult = bridge.getSnapshot("toolResult");
      const viewUUID = (
        toolResult?._meta as Record<string, unknown> | undefined
      )?.viewUUID as string | undefined;

      if (viewUUID && viewUUID !== this._viewUUID) {
        this._viewUUID = viewUUID;
        this.restoreFromLocalStorage(viewUUID);
      }
    });
  }

  private restoreFromLocalStorage(viewUUID: string): void {
    try {
      const stored = localStorage.getItem(viewUUID);
      if (stored !== null) {
        const state = JSON.parse(stored) as Record<string, unknown>;
        this._widgetState = state;
        this.widgetStateListeners.forEach((listener) => {
          listener();
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  private persistToLocalStorage(state: Record<string, unknown> | null): void {
    if (!this._viewUUID || state === null) {
      return;
    }
    try {
      localStorage.setItem(this._viewUUID, JSON.stringify(state));
    } catch (err) {
      console.error(err);
    }
  }

  private createHostContextStore<
    const Keys extends readonly McpAppContextKey[],
    R,
  >(keys: Keys, computeSnapshot: (context: PickContext<Keys>) => R) {
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
