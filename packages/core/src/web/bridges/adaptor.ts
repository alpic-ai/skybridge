import { AppsSdkBridge } from "./apps-sdk/bridge.js";
import type { AppsSdkWidgetState } from "./apps-sdk/types.js";
import { detectHost } from "./detect-host.js";
import { McpAppBridge } from "./mcp-app/bridge.js";
import type {
  Adaptor,
  AnyViewToolHandler,
  CallToolResponse,
  DownloadParams,
  DownloadResult,
  FileMetadata,
  HostContext,
  HostContextStore,
  OpenExternalOptions,
  RequestDisplayMode,
  RequestModalOptions,
  RequestSizeOptions,
  SendFollowUpMessageOptions,
  SetViewStateAction,
  UploadFileOptions,
  ViewToolConfig,
} from "./types.js";
import { NotSupportedError } from "./types.js";

const STORAGE_PREFIX = "sb:";
const MAX_STORAGE_ENTRIES = 200;
const VIEW_STATE_TOKEN_WARNING_THRESHOLD = 4000;

function getApproximateTokenCount(value: unknown): number {
  try {
    return Math.max(1, Math.ceil(JSON.stringify(value).length / 4));
  } catch {
    return 0;
  }
}

function warnOnLargeViewState(value: unknown, source: string): void {
  const tokenCount = getApproximateTokenCount(value);
  if (tokenCount > VIEW_STATE_TOKEN_WARNING_THRESHOLD) {
    console.warn(
      `[skybridge] ${source} is persisting ${tokenCount} tokens in view state; this exceeds the ${VIEW_STATE_TOKEN_WARNING_THRESHOLD}-token warning threshold and may overload model context.`,
    );
  }
}

function findStorageKey(viewUUID: string): string | undefined {
  const suffix = `:${viewUUID}`;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX) && key.endsWith(suffix)) {
      return key;
    }
  }
  return undefined;
}

/**
 * @internal
 * Single composite implementation of {@link Adaptor}. Composes the MCP App
 * bridge (always present) with an optional `window.openai` overlay. Per-method
 * routing rules are encoded inline.
 */
export class HostAdaptor implements Adaptor {
  private static instance: HostAdaptor | null = null;

  static getInstance(): HostAdaptor {
    if (!HostAdaptor.instance) {
      HostAdaptor.instance = new HostAdaptor();
    }
    return HostAdaptor.instance;
  }

  static resetInstance(): void {
    HostAdaptor.instance?.cleanup();
    HostAdaptor.instance = null;
  }

  private readonly mcp: McpAppBridge;
  private readonly openai: typeof window.openai | null = null;

  private readonly stores: { [K in keyof HostContext]: HostContextStore<K> };

  private _viewState: HostContext["viewState"] = null;
  private readonly viewStateListeners = new Set<() => void>();
  private _viewUUID: string | null = null;

  private _polyfillDisplay: HostContext["display"] = { mode: "inline" };
  private readonly polyfillDisplayListeners = new Set<() => void>();

  private readonly polyfillDisplayStore: HostContextStore<"display">;
  private readonly polyfillViewStateStore: HostContextStore<"viewState">;

  private unsubscribeViewUUID: (() => void) | null = null;

  constructor() {
    this.mcp = McpAppBridge.getInstance();

    let overlayStores: ReturnType<AppsSdkBridge["createOverlayStores"]> | null =
      null;
    if (typeof window !== "undefined" && window.openai !== undefined) {
      this.openai = window.openai;
      overlayStores = AppsSdkBridge.getInstance().createOverlayStores();
    }

    // Built once so that getHostContextStore returns stable references — required
    // by useSyncExternalStore to avoid resubscribing on every render.
    this.polyfillDisplayStore = {
      subscribe: (onChange: () => void) => {
        this.polyfillDisplayListeners.add(onChange);
        return () => {
          this.polyfillDisplayListeners.delete(onChange);
        };
      },
      getSnapshot: () => this._polyfillDisplay,
    };
    this.polyfillViewStateStore = {
      subscribe: (onChange: () => void) => {
        this.viewStateListeners.add(onChange);
        return () => {
          this.viewStateListeners.delete(onChange);
        };
      },
      getSnapshot: () => this._viewState,
    };

    let cachedHost: HostContext["host"] | undefined;
    const hostStore: HostContextStore<"host"> = {
      subscribe: this.mcp.subscribe(["userAgent", "hostInfo"]),
      getSnapshot: () => {
        const nextHost = detectHost({
          userAgent: this.mcp.getSnapshot("userAgent"),
          hostInfoName: this.mcp.getSnapshot("hostInfo")?.name,
          hasOpenAI: this.openai !== null,
        });
        if (cachedHost?.name === nextHost.name) {
          return cachedHost;
        }
        cachedHost = nextHost;
        return nextHost;
      },
    };

    this.stores = {
      ...this.mcp.createContextStores(),
      host: hostStore,
      display: overlayStores?.display ?? this.polyfillDisplayStore,
      viewState: overlayStores?.viewState ?? this.polyfillViewStateStore,
    };

    this.subscribeToViewUUID();
  }

  /** @internal Release any subscriptions held on the underlying bridges. */
  public cleanup(): void {
    this.unsubscribeViewUUID?.();
    this.unsubscribeViewUUID = null;
  }

  // ---- Adaptor interface ----

  public getHostContextStore = <K extends keyof HostContext>(
    key: K,
  ): HostContextStore<K> => this.stores[key];

  public callTool = async <
    ToolArgs extends Record<string, unknown> | null = null,
    ToolResponse extends CallToolResponse = CallToolResponse,
  >(
    name: string,
    args: ToolArgs,
  ): Promise<ToolResponse> => {
    const app = await this.mcp.getApp();
    const response = await app.callServerTool({
      name,
      arguments: args ?? undefined,
    });
    return {
      content: response.content,
      structuredContent: response.structuredContent ?? {},
      isError: response.isError ?? false,
      meta: response._meta ?? {},
    } as ToolResponse;
  };

  public registerViewTool = (
    config: ViewToolConfig,
    handler: AnyViewToolHandler,
  ): (() => void) => {
    return this.mcp.registerViewTool(config, handler);
  };

  public requestDisplayMode = async (mode: RequestDisplayMode) => {
    const app = await this.mcp.getApp();
    return app.requestDisplayMode({ mode });
  };

  public requestClose = async (): Promise<void> => {
    if (this.openai) {
      await this.openai.requestClose();
    }
    const app = await this.mcp.getApp();
    await app.requestTeardown();
  };

  public requestSize = async (size: RequestSizeOptions): Promise<void> => {
    const app = await this.mcp.getApp();
    await app.sendSizeChanged(size);
  };

  public sendFollowUpMessage = async (
    prompt: string,
    options?: SendFollowUpMessageOptions,
  ): Promise<void> => {
    if (this.openai) {
      await this.openai.sendFollowUpMessage({
        prompt,
        scrollToBottom: options?.scrollToBottom,
      });
      return;
    }
    const app = await this.mcp.getApp();
    await app.sendMessage({
      role: "user",
      content: [{ type: "text", text: prompt }],
    });
  };

  public openExternal = (href: string, options?: OpenExternalOptions): void => {
    if (this.openai) {
      this.openai.openExternal({ href, ...options });
      return;
    }
    this.mcp
      .getApp()
      .then((app) => app.openLink({ url: href }))
      .catch((err) => {
        console.error("Failed to open external link:", err);
      });
  };

  public download = async (params: DownloadParams): Promise<DownloadResult> => {
    const app = await this.mcp.getApp();
    if (!app.getHostCapabilities()?.downloadFile) {
      console.error(
        "[skybridge] download: host does not support ui/download-file",
      );
      return { isError: true };
    }
    return app.downloadFile(params);
  };

  public setViewState = async (
    stateOrUpdater: SetViewStateAction,
  ): Promise<void> => {
    if (this.openai) {
      const modelContent =
        typeof stateOrUpdater === "function"
          ? stateOrUpdater(this.openai.widgetState?.modelContent ?? null)
          : stateOrUpdater;
      warnOnLargeViewState(modelContent, "setWidgetState");
      await this.openai.setWidgetState({
        privateContent: {},
        ...this.openai.widgetState,
        modelContent,
      });
      return;
    }

    const newState =
      typeof stateOrUpdater === "function"
        ? stateOrUpdater(this._viewState)
        : stateOrUpdater;
    warnOnLargeViewState(newState, "setViewState");

    // update local state immediately so successive calls see fresh state
    this._viewState = newState;
    this.viewStateListeners.forEach((l) => {
      l();
    });

    this.persistToLocalStorage(newState);

    try {
      const app = await this.mcp.getApp();
      await app.updateModelContext({
        structuredContent: newState,
        content: [{ type: "text", text: JSON.stringify(newState) }],
      });
    } catch (error) {
      console.error("Failed to update view state in MCP App.", error);
    }
  };

  public uploadFile = async (
    file: File,
    options?: UploadFileOptions,
  ): Promise<FileMetadata> => {
    if (!this.openai) {
      throw new NotSupportedError("uploadFile");
    }
    const metadata = await this.openai.uploadFile(file, options);
    await this.trackFileIds(metadata.fileId);
    return metadata;
  };

  public getFileDownloadUrl = (
    file: FileMetadata,
  ): Promise<{ downloadUrl: string }> => {
    if (!this.openai) {
      return Promise.reject(new NotSupportedError("getFileDownloadUrl"));
    }
    return this.openai.getFileDownloadUrl(file);
  };

  public selectFiles = async (): Promise<FileMetadata[]> => {
    if (!this.openai) {
      throw new NotSupportedError("selectFiles");
    }
    if (!this.openai.selectFiles) {
      throw new Error(
        "selectFiles is not supported by the current host version.",
      );
    }
    const files = await this.openai.selectFiles();
    if (files.length > 0) {
      await this.trackFileIds(...files.map((f) => f.fileId));
    }
    return files;
  };

  public openModal = (options: RequestModalOptions): void => {
    if (this.openai) {
      this.openai.requestModal(options);
      return;
    }
    this._polyfillDisplay = { mode: "modal", params: options.params };
    this.polyfillDisplayListeners.forEach((l) => {
      l();
    });
  };

  public setOpenInAppUrl = (href: string): Promise<void> => {
    if (!this.openai) {
      return Promise.reject(new NotSupportedError("setOpenInAppUrl"));
    }
    const trimmed = href.trim();
    if (!trimmed) {
      return Promise.reject(new Error("The href parameter is required."));
    }
    return this.openai.setOpenInAppUrl({ href: trimmed });
  };

  public closeModal = (): void => {
    if (this.openai) {
      return; // host owns modal lifecycle
    }
    this._polyfillDisplay = { mode: "inline" };
    this.polyfillDisplayListeners.forEach((l) => {
      l();
    });
  };

  private async trackFileIds(...fileIds: string[]): Promise<void> {
    if (!this.openai) {
      return;
    }
    const current = this.openai.widgetState;
    const state: AppsSdkWidgetState = current
      ? { ...current }
      : { modelContent: {}, privateContent: {} };
    if (!state.imageIds) {
      state.imageIds = [];
    }
    state.imageIds.push(...fileIds);
    await this.openai.setWidgetState(state);
  }

  // ---- viewState persistence helpers ----

  private subscribeToViewUUID(): void {
    this.unsubscribeViewUUID = this.mcp.subscribe("toolResult")(() => {
      const toolResult = this.mcp.getSnapshot("toolResult");
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
      const existingKey = findStorageKey(viewUUID);
      if (existingKey) {
        const stored = localStorage.getItem(existingKey);
        if (stored !== null) {
          this._viewState = JSON.parse(stored);
          this.viewStateListeners.forEach((l) => {
            l();
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  protected persistToLocalStorage(state: Record<string, unknown> | null): void {
    if (!this._viewUUID || state === null) {
      return;
    }
    try {
      const oldKey = findStorageKey(this._viewUUID);
      if (oldKey) {
        localStorage.removeItem(oldKey);
      }
      const newKey = `${STORAGE_PREFIX}${Date.now()}:${this._viewUUID}`;
      localStorage.setItem(newKey, JSON.stringify(state));
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_PREFIX)) {
          keys.push(key);
        }
      }
      if (keys.length <= MAX_STORAGE_ENTRIES) {
        return;
      }
      keys.sort();
      const toRemove = keys.slice(0, keys.length - MAX_STORAGE_ENTRIES);
      for (const key of toRemove) {
        localStorage.removeItem(key);
      }
    } catch (err) {
      console.error(err);
    }
  }
}
