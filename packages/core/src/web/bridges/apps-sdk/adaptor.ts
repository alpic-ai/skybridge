import type {
  Adaptor,
  CallToolResponse,
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

/**
 * Estimates the token count for a given state object.
 * Uses a rough approximation: 1 token ≈ 4 characters.
 * @param state - The widget state to estimate tokens for
 * @returns Estimated token count
 */
function estimateTokenCount(state: unknown): number {
  const jsonString = JSON.stringify(state);
  return Math.ceil(jsonString.length / 4);
}

/**
 * Warns if the widget state exceeds the 4K token limit.
 * Per OpenAI Apps SDK documentation, widget state should not exceed 4K tokens.
 * @param state - The widget state to check
 */
function warnIfExceedsTokenLimit(state: AppsSdkWidgetState): void {
  const TOKEN_LIMIT = 4000;
  const estimatedTokens = estimateTokenCount(state);

  if (estimatedTokens > TOKEN_LIMIT) {
    console.warn(
      `[skybridge] Widget state exceeds ${TOKEN_LIMIT} token limit (estimated: ${estimatedTokens} tokens). ` +
        `This may cause issues with ChatGPT context. Consider reducing the state size. ` +
        `See: https://developers.openai.com/apps-sdk/build/chatgpt-ui#persist-component-state-expose-context-to-chatgpt`,
    );
  }
}

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
    return window.openai.callTool<ToolArgs, ToolResponse>(name, args);
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

  public openExternal(href: string, options: OpenExternalOptions = {}): void {
    window.openai.openExternal({ href, ...options });
  }

  public setViewState = (stateOrUpdater: SetViewStateAction): Promise<void> => {
    const modelContent =
      typeof stateOrUpdater === "function"
        ? stateOrUpdater(window.openai.widgetState?.modelContent ?? null)
        : stateOrUpdater;

    const newState: AppsSdkWidgetState = {
      privateContent: {},
      ...window.openai.widgetState,
      modelContent,
    };

    warnIfExceedsTokenLimit(newState);

    return window.openai.setWidgetState(newState);
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

    warnIfExceedsTokenLimit(state);

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
}
