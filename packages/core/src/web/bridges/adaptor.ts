import type {
  Adaptor,
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
} from "./types.js";
import { NotSupportedError } from "./types.js";
import type { AppsSdkWidgetState } from "./apps-sdk/types.js";
import { AppsSdkBridge } from "./apps-sdk/bridge.js";
import { McpAppBridge } from "./mcp-app/bridge.js";
import {
  buildAppsSdkOverlayStores,
  buildMcpContextStores,
} from "./host-context-stores.js";

const STORAGE_PREFIX = "sb:";
const MAX_STORAGE_ENTRIES = 200;

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
  private readonly mcp: McpAppBridge;
  private readonly oai: typeof window.openai | null;
  private readonly oaiBridge: AppsSdkBridge | null;

  private readonly mcpStores: ReturnType<typeof buildMcpContextStores>;
  private readonly oaiStores: ReturnType<typeof buildAppsSdkOverlayStores> | null;

  private _viewState: HostContext["viewState"] = null;
  private readonly viewStateListeners = new Set<() => void>();
  private _viewUUID: string | null = null;

  private _polyfillDisplay: HostContext["display"] = { mode: "inline" };
  private readonly polyfillDisplayListeners = new Set<() => void>();

  constructor() {
    this.mcp = McpAppBridge.getInstance();
    this.mcpStores = buildMcpContextStores(this.mcp);

    if (typeof window !== "undefined" && window.openai !== undefined) {
      this.oai = window.openai;
      this.oaiBridge = AppsSdkBridge.getInstance();
      this.oaiStores = buildAppsSdkOverlayStores(this.oaiBridge);
    } else {
      this.oai = null;
      this.oaiBridge = null;
      this.oaiStores = null;
    }

    this.subscribeToViewUUID();
  }

  public hasAppsSdkOverlay(): boolean {
    return this.oai !== null;
  }

  // ---- Adaptor interface (stubs) ----

  public getHostContextStore<K extends keyof HostContext>(
    _key: K,
  ): HostContextStore<K> {
    throw new NotSupportedError("getHostContextStore", "not yet implemented");
  }

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

  public requestDisplayMode = async (mode: RequestDisplayMode) => {
    const app = await this.mcp.getApp();
    return app.requestDisplayMode({ mode });
  };

  public requestClose = async (): Promise<void> => {
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
    if (this.oai && options?.scrollToBottom !== undefined) {
      await this.oai.sendFollowUpMessage({
        prompt,
        scrollToBottom: options.scrollToBottom,
      });
      return;
    }
    const app = await this.mcp.getApp();
    await app.sendMessage({
      role: "user",
      content: [{ type: "text", text: prompt }],
    });
  };

  public openExternal = (
    href: string,
    options?: OpenExternalOptions,
  ): void => {
    if (this.oai && options?.redirectUrl === false) {
      this.oai.openExternal({ href, redirectUrl: false });
      return;
    }
    this.mcp
      .getApp()
      .then((app) => app.openLink({ url: href }))
      .catch((err) => {
        console.error("Failed to open external link:", err);
      });
  };

  public download = async (
    params: DownloadParams,
  ): Promise<DownloadResult> => {
    const app = await this.mcp.getApp();
    if (!app.getHostCapabilities()?.downloadFile) {
      console.error(
        "[skybridge] download: host does not support ui/download-file",
      );
      return { isError: true };
    }
    return app.downloadFile(params);
  };

  public setViewState(_s: SetViewStateAction): Promise<void> {
    throw new NotSupportedError("setViewState", "not yet implemented");
  }

  public uploadFile = async (
    file: File,
    options?: UploadFileOptions,
  ): Promise<FileMetadata> => {
    if (!this.oai) throw new NotSupportedError("uploadFile");
    const metadata = await this.oai.uploadFile(file, options);
    await this.trackFileIds(metadata.fileId);
    return metadata;
  };

  public getFileDownloadUrl = (
    file: FileMetadata,
  ): Promise<{ downloadUrl: string }> => {
    if (!this.oai) {
      return Promise.reject(new NotSupportedError("getFileDownloadUrl"));
    }
    return this.oai.getFileDownloadUrl(file);
  };

  public selectFiles = async (): Promise<FileMetadata[]> => {
    if (!this.oai) throw new NotSupportedError("selectFiles");
    if (!this.oai.selectFiles) {
      throw new Error(
        "selectFiles is not supported by the current host version.",
      );
    }
    const files = await this.oai.selectFiles();
    if (files.length > 0) {
      await this.trackFileIds(...files.map((f) => f.fileId));
    }
    return files;
  };

  public openModal(_options: RequestModalOptions): void {
    throw new NotSupportedError("openModal", "not yet implemented");
  }

  public setOpenInAppUrl = (href: string): Promise<void> => {
    if (!this.oai) {
      return Promise.reject(new NotSupportedError("setOpenInAppUrl"));
    }
    href = href.trim();
    if (!href) throw new Error("The href parameter is required.");
    return this.oai.setOpenInAppUrl({ href });
  };

  public closeModal(): void {
    throw new NotSupportedError("closeModal", "not yet implemented");
  }

  private async trackFileIds(...fileIds: string[]): Promise<void> {
    if (!this.oai) return;
    const current = this.oai.widgetState;
    const state: AppsSdkWidgetState = current
      ? { ...current }
      : { modelContent: {}, privateContent: {} };
    if (!state.imageIds) state.imageIds = [];
    state.imageIds.push(...fileIds);
    await this.oai.setWidgetState(state);
  }

  // ---- viewState persistence helpers (used in subsequent tasks) ----

  private subscribeToViewUUID(): void {
    this.mcp.subscribe("toolResult")(() => {
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
          this.viewStateListeners.forEach((l) => l());
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  protected persistToLocalStorage(
    state: Record<string, unknown> | null,
  ): void {
    if (!this._viewUUID || state === null) return;
    try {
      const oldKey = findStorageKey(this._viewUUID);
      if (oldKey) localStorage.removeItem(oldKey);
      const newKey = `${STORAGE_PREFIX}${Date.now()}:${this._viewUUID}`;
      localStorage.setItem(newKey, JSON.stringify(state));
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
      }
      if (keys.length <= MAX_STORAGE_ENTRIES) return;
      keys.sort();
      const toRemove = keys.slice(0, keys.length - MAX_STORAGE_ENTRIES);
      for (const key of toRemove) localStorage.removeItem(key);
    } catch (err) {
      console.error(err);
    }
  }
}
