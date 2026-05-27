import type {
  Adaptor,
  CallToolArgs,
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

  public callTool<
    ToolArgs extends CallToolArgs = null,
    ToolResponse extends CallToolResponse = CallToolResponse,
  >(_name: string, _args: ToolArgs): Promise<ToolResponse> {
    throw new NotSupportedError("callTool", "not yet implemented");
  }

  public requestDisplayMode(_mode: RequestDisplayMode): Promise<{ mode: RequestDisplayMode }> {
    throw new NotSupportedError("requestDisplayMode", "not yet implemented");
  }

  public requestClose(): Promise<void> {
    throw new NotSupportedError("requestClose", "not yet implemented");
  }

  public requestSize(_size: RequestSizeOptions): Promise<void> {
    throw new NotSupportedError("requestSize", "not yet implemented");
  }

  public sendFollowUpMessage(
    _prompt: string,
    _options?: SendFollowUpMessageOptions,
  ): Promise<void> {
    throw new NotSupportedError("sendFollowUpMessage", "not yet implemented");
  }

  public openExternal(_href: string, _options?: OpenExternalOptions): void {
    throw new NotSupportedError("openExternal", "not yet implemented");
  }

  public download(_params: DownloadParams): Promise<DownloadResult> {
    throw new NotSupportedError("download", "not yet implemented");
  }

  public setViewState(_s: SetViewStateAction): Promise<void> {
    throw new NotSupportedError("setViewState", "not yet implemented");
  }

  public uploadFile(_f: File, _o?: UploadFileOptions): Promise<FileMetadata> {
    throw new NotSupportedError("uploadFile", "not yet implemented");
  }

  public getFileDownloadUrl(_f: FileMetadata): Promise<{ downloadUrl: string }> {
    throw new NotSupportedError("getFileDownloadUrl", "not yet implemented");
  }

  public selectFiles(): Promise<FileMetadata[]> {
    throw new NotSupportedError("selectFiles", "not yet implemented");
  }

  public openModal(_options: RequestModalOptions): void {
    throw new NotSupportedError("openModal", "not yet implemented");
  }

  public setOpenInAppUrl(_href: string): Promise<void> {
    throw new NotSupportedError("setOpenInAppUrl", "not yet implemented");
  }

  public closeModal(): void {
    throw new NotSupportedError("closeModal", "not yet implemented");
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
