import { ResultSchema } from "@modelcontextprotocol/core";
import * as z from "zod/v4";
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
  FollowUpMessage,
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
  ViewToolConfig,
} from "./types.js";
import { NotSupportedError } from "./types.js";

const STORAGE_PREFIX = "sb:";
const MAX_STORAGE_ENTRIES = 200;

function isImage(mimeType: string | undefined): boolean {
  return mimeType?.startsWith("image/") ?? false;
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
  private _modelContext: ModelContextParams | null = null;

  private _polyfillDisplay: HostContext["display"] = { mode: "inline" };
  private readonly polyfillDisplayListeners = new Set<() => void>();

  private readonly polyfillDisplayStore: HostContextStore<"display">;
  private readonly polyfillViewStateStore: HostContextStore<"viewState">;

  private unsubscribeViewUUID: (() => void) | null = null;
  private unsubscribeModelContext: (() => void) | null = null;

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

    this.stores = {
      ...this.mcp.createContextStores(),
      display: overlayStores?.display ?? this.polyfillDisplayStore,
      viewState: overlayStores?.viewState ?? this.polyfillViewStateStore,
    };

    this.subscribeToViewUUID();
    this.unsubscribeModelContext = this.mcp.subscribe("openai/modelContext")(
      () => {
        if (this.mcp.getSnapshot("openai/modelContext") === null) {
          this._modelContext = null;
        }
      },
    );
  }

  /** @internal Release any subscriptions held on the underlying bridges. */
  public cleanup(): void {
    this.unsubscribeViewUUID?.();
    this.unsubscribeViewUUID = null;
    this.unsubscribeModelContext?.();
    this.unsubscribeModelContext = null;
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
    const response = await app.callServerTool(params, { timeout });
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
    prompt: FollowUpMessage,
    options?: SendFollowUpMessageOptions,
  ): Promise<void> => {
    const target = options?.target;
    if (this.openai && typeof prompt === "string" && target !== "new") {
      await this.openai.sendFollowUpMessage({
        prompt,
        scrollToBottom: options?.scrollToBottom,
      });
      return;
    }
    const app = await this.mcp.getApp();
    if (
      target === "new" &&
      !app.getHostCapabilities()?.experimental?.["openai/message"]
    ) {
      throw new NotSupportedError(
        "sendFollowUpMessage",
        "the host does not advertise openai/message, so it can't open a new conversation",
      );
    }
    const result = await app.sendMessage({
      role: "user",
      content:
        typeof prompt === "string" ? [{ type: "text", text: prompt }] : prompt,
      ...(target === "new" && { _meta: { "openai/message": { target } } }),
    });
    if (result?.isError) {
      throw new Error("The host rejected the follow-up message.");
    }
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
      await this.sendModelContext();
    } catch (error) {
      console.error("Failed to update view state in MCP App.", error);
    }
  };

  public updateModelContext = async (
    params: ModelContextParams,
  ): Promise<string | undefined> => {
    const app = await this.mcp.getApp();
    const capabilities = app.getHostCapabilities();
    if (
      !capabilities?.updateModelContext &&
      !capabilities?.experimental?.["openai/modelContext"]
    ) {
      throw new NotSupportedError(
        "updateModelContext",
        "the host does not advertise updateModelContext",
      );
    }
    const previous = this._modelContext;
    this._modelContext = params;
    const result = await this.sendModelContext().catch((error: unknown) => {
      if (this._modelContext === params) {
        this._modelContext = previous;
      }
      throw error;
    });
    const parsed = z
      .object({ updateId: z.string() })
      .safeParse(result._meta?.["openai/modelContext"]);
    return parsed.success ? parsed.data.updateId : undefined;
  };

  private async sendModelContext() {
    const viewState = this.openai ? null : this._viewState;
    const extra = this._modelContext;
    const collisions = Object.keys(extra?.structuredContent ?? {}).filter(
      (key) => viewState !== null && key in viewState,
    );
    if (collisions.length > 0) {
      console.warn(
        `skybridge: view state overrides model context keys ${collisions.join(", ")}.`,
      );
    }
    const structuredContent = { ...extra?.structuredContent, ...viewState };
    const app = await this.mcp.getApp();
    return app.updateModelContext({
      ...(Object.keys(structuredContent).length > 0 && { structuredContent }),
      content: [
        ...(viewState === null
          ? []
          : [
              {
                type: "text" as const,
                text: JSON.stringify(viewState),
                annotations: { audience: ["assistant" as const] },
              },
            ]),
        ...(extra?.content ?? []),
      ],
    });
  }

  public openFile = async (path: string): Promise<void> => {
    const app = await this.mcp.getApp();
    if (!app.getHostCapabilities()?.experimental?.["openai/files"]) {
      throw new NotSupportedError(
        "openFile",
        "the host does not advertise openai/files",
      );
    }
    await app.request(
      { method: "openai/files/open", params: { path } },
      ResultSchema,
    );
  };

  public uploadFile = async (
    file: File,
    options?: UploadFileOptions,
  ): Promise<FileMetadata> => {
    if (!this.openai) {
      throw new NotSupportedError("uploadFile");
    }
    if (!this.openai.uploadFile) {
      throw new NotSupportedError(
        "uploadFile",
        "not available on the current host version",
      );
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
    if (!this.openai.getFileDownloadUrl) {
      return Promise.reject(
        new NotSupportedError(
          "getFileDownloadUrl",
          "not available on the current host version",
        ),
      );
    }
    return this.openai.getFileDownloadUrl(file);
  };

  public selectFiles = async (): Promise<FileMetadata[]> => {
    if (!this.openai) {
      throw new NotSupportedError("selectFiles");
    }
    if (!this.openai.selectFiles) {
      throw new NotSupportedError(
        "selectFiles",
        "not available on the current host version",
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
