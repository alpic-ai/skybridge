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
} from "../types.js";
import { AppsSdkBridge } from "./bridge.js";
import type { AppsSdkWidgetState } from "./types.js";

/** @internal Apps SDK implementation of {@link Adaptor}. Resolved via {@link getAdaptor}. */
export class AppsSdkAdaptor implements Adaptor {
  private static instance: AppsSdkAdaptor | null = null;

  public static getInstance(): AppsSdkAdaptor {
    if (!AppsSdkAdaptor.instance) {
      AppsSdkAdaptor.instance = new AppsSdkAdaptor();
    }
    return AppsSdkAdaptor.instance;
  }

  public static resetInstance(): void {
    AppsSdkAdaptor.instance = null;
  }

  public getHostContextStore<K extends keyof HostContext>(
    key: K,
  ): HostContextStore<K> {
    const bridge = AppsSdkBridge.getInstance();

    if (key === "viewState") {
      return {
        subscribe: bridge.subscribe("widgetState"),
        getSnapshot: () =>
          bridge.getSnapshot("widgetState")?.modelContent ?? null,
      } as HostContextStore<K>;
    }

    if (key === "display") {
      return {
        subscribe: bridge.subscribe("view"),
        getSnapshot: () => bridge.getSnapshot("view"),
      } as HostContextStore<K>;
    }

    return {
      subscribe: bridge.subscribe(key),
      getSnapshot: () => bridge.getSnapshot(key),
    } as HostContextStore<K>;
  }

  public callTool = async <
    ToolArgs extends Record<string, unknown> | null = null,
    ToolResponse extends CallToolResponse = CallToolResponse,
  >(
    name: string,
    args: ToolArgs,
  ): Promise<ToolResponse> => {
    const response = await (window.openai.callTool(name, args) as Promise<
      CallToolResponse & { _meta?: CallToolResponse["meta"] }
    >);
    return {
      content: response.content,
      structuredContent: response.structuredContent ?? {},
      isError: response.isError ?? false,
      meta: response._meta ?? response.meta ?? {},
    } as ToolResponse;
  };

  public requestDisplayMode = (
    mode: RequestDisplayMode,
  ): Promise<{ mode: RequestDisplayMode }> => {
    return window.openai.requestDisplayMode({ mode });
  };

  public requestClose = (): Promise<void> => {
    return window.openai.requestClose();
  };

  public requestSize = async (_size: RequestSizeOptions): Promise<void> => {
    console.warn("[skybridge] requestSize: not supported on Apps SDK");
  };

  public sendFollowUpMessage = (
    prompt: string,
    options?: SendFollowUpMessageOptions,
  ): Promise<void> => {
    return window.openai.sendFollowUpMessage({
      prompt,
      scrollToBottom: options?.scrollToBottom,
    });
  };

  public download = async (
    _params: DownloadParams,
  ): Promise<DownloadResult> => {
    console.error("[skybridge] download: not supported on Apps SDK");
    return { isError: true };
  };

  public openExternal(href: string, options: OpenExternalOptions = {}): void {
    window.openai.openExternal({ href, ...options });
  }

  public setViewState = (stateOrUpdater: SetViewStateAction): Promise<void> => {
    const modelContent =
      typeof stateOrUpdater === "function"
        ? stateOrUpdater(window.openai.widgetState?.modelContent ?? null)
        : stateOrUpdater;

    return window.openai.setWidgetState({
      privateContent: {},
      ...window.openai.widgetState,
      modelContent,
    });
  };

  public uploadFile = async (file: File, options?: UploadFileOptions) => {
    const metadata = await window.openai.uploadFile(file, options);
    await this.trackFileIds(metadata.fileId);
    return metadata;
  };

  public getFileDownloadUrl = (file: { fileId: string }) => {
    return window.openai.getFileDownloadUrl(file);
  };

  public selectFiles = async (): Promise<FileMetadata[]> => {
    if (!window.openai.selectFiles) {
      throw new Error(
        "selectFiles is not supported by the current host version.",
      );
    }
    const files = await window.openai.selectFiles();
    if (files.length > 0) {
      await this.trackFileIds(...files.map((f) => f.fileId));
    }
    return files;
  };

  private async trackFileIds(...fileIds: string[]): Promise<void> {
    const state: AppsSdkWidgetState = window.openai.widgetState
      ? { ...window.openai.widgetState }
      : { modelContent: {}, privateContent: {} };
    if (!state.imageIds) {
      state.imageIds = [];
    }
    state.imageIds.push(...fileIds);
    await window.openai.setWidgetState(state);
  }

  public openModal(options: RequestModalOptions) {
    return window.openai.requestModal(options);
  }

  public setOpenInAppUrl(href: string): Promise<void> {
    href = href.trim();

    if (!href) {
      throw new Error("The href parameter is required.");
    }

    return window.openai.setOpenInAppUrl({ href });
  }

  public registerViewTool = (): (() => void) => {
    console.warn(
      "[skybridge] registerViewTool: view tools are not supported on the Apps SDK runtime",
    );
    return () => {};
  };
}
