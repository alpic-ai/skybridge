import { warnOnLargeViewState } from "../../context-warnings.js";
import { AppsSdkBridge } from "./apps-sdk/bridge.js";
import type { AppsSdkWidgetState } from "./apps-sdk/types.js";
import { McpAppBridge } from "./mcp-app/bridge.js";
import type {
  Adaptor,
  AnyViewToolHandler,
  CallToolOptions,
  CallToolResponse,
  DownloadParams,
  DownloadResult,
  FileMetadata,
  HostContext,
  HostContextStore,
  ModelContextParams,
  OpenExternalOptions,
  RequestDisplayMode,
  RequestModalOptions,
  RequestSizeOptions,
  SendFollowUpMessageOptions,
  SetViewStateAction,
  UploadFileOptions,
  ViewStateOptions,
  ViewToolConfig,
} from "./types.js";
import { NotSupportedError } from "./types.js";

const STORAGE_PREFIX = "sb:";
const PRIVATE_STORAGE_PREFIX = "sbp:";
const MAX_STORAGE_ENTRIES = 200;

function isImage(mimeType: string | undefined): boolean {
  return mimeType?.startsWith("image/") ?? false;
}

function findStorageKey(prefix: string, viewUUID: string): string | undefined {
  const suffix = `:${viewUUID}`;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix) && key.endsWith(suffix)) {
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
  private _privateViewState: HostContext["privateViewState"] = null;
  private readonly privateViewStateListeners = new Set<() => void>();
  private _viewUUID: string | null = null;

  private _polyfillDisplay: HostContext["display"] = { mode: "inline" };
  private readonly polyfillDisplayListeners = new Set<() => void>();

  private readonly polyfillDisplayStore: HostContextStore<"display">;
  private readonly polyfillViewStateStore: HostContextStore<"viewState">;
  private readonly polyfillPrivateViewStateStore: HostContextStore<"privateViewState">;

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
    this.polyfillPrivateViewStateStore = {
      subscribe: (onChange: () => void) => {
        this.privateViewStateListeners.add(onChange);
        return () => {
          this.privateViewStateListeners.delete(onChange);
        };
      },
      getSnapshot: () => this._privateViewState,
    };

    this.stores = {
      ...this.mcp.createContextStores(),
      display: overlayStores?.display ?? this.polyfillDisplayStore,
      viewState: overlayStores?.viewState ?? this.polyfillViewStateStore,
      privateViewState:
        overlayStores?.privateViewState ?? this.polyfillPrivateViewStateStore,
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
    options?: CallToolOptions,
  ): Promise<ToolResponse> => {
    const timeout = options?.timeout;
    if (timeout !== undefined && (!Number.isFinite(timeout) || timeout <= 0)) {
      throw new RangeError(
        "Tool call timeout must be a positive, finite number of milliseconds.",
      );
    }
    const app = await this.mcp.getApp();
    const params = { name, arguments: args ?? undefined };
    const response =
      timeout === undefined
        ? await app.callServerTool(params)
        : await app.callServerTool(params, { timeout });
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
    options?: ViewStateOptions,
  ): Promise<void> => {
    if (options?.modelContext === false) {
      await this.setPrivateViewState(stateOrUpdater);
      return;
    }
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

  private async setPrivateViewState(
    stateOrUpdater: SetViewStateAction,
  ): Promise<void> {
    if (this.openai) {
      const current = this.stores.privateViewState.getSnapshot();
      const state =
        typeof stateOrUpdater === "function"
          ? stateOrUpdater(current)
          : stateOrUpdater;
      await this.openai.setWidgetState({
        modelContent: {},
        ...this.openai.widgetState,
        privateContent: {
          ...this.openai.widgetState?.privateContent,
          skybridgeViewState: state,
        },
      });
      return;
    }
    const state =
      typeof stateOrUpdater === "function"
        ? stateOrUpdater(this._privateViewState)
        : stateOrUpdater;
    this._privateViewState = state;
    this.privateViewStateListeners.forEach((l) => {
      l();
    });
    this.persistToLocalStorage(state, PRIVATE_STORAGE_PREFIX);
  }

  public updateModelContext = async (
    params: ModelContextParams,
  ): Promise<void> => {
    const app = await this.mcp.getApp();
    if (!app.getHostCapabilities()?.experimental?.["openai/modelContext"]) {
      throw new NotSupportedError(
        "updateModelContext",
        "the host does not advertise openai/modelContext",
      );
    }
    await app.updateModelContext(params);
  };

  public uploadFile = async (
    file: File,
    options?: UploadFileOptions,
  ): Promise<FileMetadata> => {
    if (!this.openai) {
      throw new NotSupportedError("uploadFile");
    }
    const metadata = await this.openai.uploadFile(file, options);
    if (isImage(metadata.mimeType ?? file.type)) {
      await this.trackFileIds(metadata.fileId);
    }
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
    const imageIds: string[] = [];
    for (const file of files) {
      if (isImage(file.mimeType)) {
        imageIds.push(file.fileId);
      }
    }
    if (imageIds.length > 0) {
      await this.trackFileIds(...imageIds);
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
    const shared = this.readFromLocalStorage(STORAGE_PREFIX, viewUUID);
    if (shared !== null) {
      this._viewState = shared;
      this.viewStateListeners.forEach((l) => {
        l();
      });
    }
    const local = this.readFromLocalStorage(PRIVATE_STORAGE_PREFIX, viewUUID);
    if (local !== null) {
      this._privateViewState = local;
      this.privateViewStateListeners.forEach((l) => {
        l();
      });
    }
  }

  private readFromLocalStorage(
    prefix: string,
    viewUUID: string,
  ): Record<string, unknown> | null {
    try {
      const existingKey = findStorageKey(prefix, viewUUID);
      const stored = existingKey ? localStorage.getItem(existingKey) : null;
      return stored === null ? null : JSON.parse(stored);
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  protected persistToLocalStorage(
    state: Record<string, unknown> | null,
    prefix = STORAGE_PREFIX,
  ): void {
    if (!this._viewUUID || state === null) {
      return;
    }
    try {
      const oldKey = findStorageKey(prefix, this._viewUUID);
      if (oldKey) {
        localStorage.removeItem(oldKey);
      }
      const newKey = `${prefix}${Date.now()}:${this._viewUUID}`;
      localStorage.setItem(newKey, JSON.stringify(state));
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix)) {
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
