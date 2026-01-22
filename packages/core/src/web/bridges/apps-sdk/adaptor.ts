import { warnIfExceedsTokenLimit } from "../../helpers/warn-token-limit.js";
import type {
  Adaptor,
  CallToolResponse,
  DisplayMode,
  HostContext,
  HostContextStore,
  RequestModalOptions,
  SetWidgetStateAction,
} from "../types.js";
import { AppsSdkBridge } from "./bridge.js";

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
    return {
      subscribe: bridge.subscribe(key),
      getSnapshot: () => bridge.getSnapshot(key),
    };
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
    mode: DisplayMode,
  ): Promise<{ mode: DisplayMode }> => {
    return window.openai.requestDisplayMode({ mode });
  };

  public sendFollowUpMessage = (prompt: string): Promise<void> => {
    return window.openai.sendFollowUpMessage({ prompt });
  };

  public openExternal(href: string): void {
    window.openai.openExternal({ href });
  }

  public setWidgetState = (
    stateOrUpdater: SetWidgetStateAction,
  ): Promise<void> => {
    const newState =
      typeof stateOrUpdater === "function"
        ? stateOrUpdater(window.openai.widgetState)
        : stateOrUpdater;

    warnIfExceedsTokenLimit(newState, "setWidgetState");

    return window.openai.setWidgetState(newState);
  };

  public uploadFile = (file: File) => {
    return window.openai.uploadFile(file);
  };

  public getFileDownloadUrl = (file: { fileId: string }) => {
    return window.openai.getFileDownloadUrl(file);
  };

  public openModal(options: RequestModalOptions) {
    return window.openai.requestModal(options);
  }

  public setOpenInAppUrl(href: string): Promise<void> {
    href = href.trim();

    if (!href) {
      throw new Error("The href parameter is required.");
    }

    const serverUrl = window.skybridge.serverUrl;
    if (!serverUrl) {
      throw new Error(
        "The widgetDomain property has not been set on the widget resource meta object.",
      );
    }

    const domainUrl = new URL(serverUrl);
    const hrefUrl = new URL(href, serverUrl);

    if (domainUrl.origin !== hrefUrl.origin) {
      throw new Error(
        "Provided href is not compatible with widget domain: origin differs",
      );
    }

    return window.openai.setOpenInAppUrl({ href });
  }
}
