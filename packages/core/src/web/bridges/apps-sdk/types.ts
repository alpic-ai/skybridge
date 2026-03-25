import type { UnknownObject } from "../../types.js";
import type {
  CallToolArgs,
  CallToolResponse,
  FileMetadata,
  RequestModalOptions,
  UploadFileOptions,
} from "../types.js";

type DisplayMode = "pip" | "inline" | "fullscreen" | "modal";
type RequestDisplayMode = Exclude<DisplayMode, "modal">;

export type AppsSdkWidgetState = {
  modelContent: Record<string, unknown>;
  privateContent: Record<string, unknown>;
  imageIds?: string[];
};

export const TOOL_RESPONSE_EVENT_TYPE = "openai:tool_response";
export class ToolResponseEvent extends CustomEvent<{
  tool: { name: string; args: UnknownObject };
}> {
  override readonly type = TOOL_RESPONSE_EVENT_TYPE;
}

declare global {
  interface Window {
    openai: AppsSdkMethods & AppsSdkContext;
  }

  interface WindowEventMap {
    [SET_GLOBALS_EVENT_TYPE]: SetGlobalsEvent;
  }
}

export type AppsSdkContext<
  ToolInput extends UnknownObject = Record<never, unknown>,
  ToolOutput extends UnknownObject = UnknownObject,
  ToolResponseMetadata extends UnknownObject = UnknownObject,
  WS extends AppsSdkWidgetState = AppsSdkWidgetState,
> = {
  theme: Theme;
  userAgent: UserAgent;
  locale: string;

  // layout
  maxHeight: number | undefined;
  displayMode: DisplayMode;
  safeArea: SafeArea;
  view: View;

  // state
  toolInput: ToolInput;
  toolOutput: ToolOutput | { text: string } | null;
  toolResponseMetadata: ToolResponseMetadata | null;
  widgetState: WS | null;
};

export type AppsSdkMethods<WS extends AppsSdkWidgetState = AppsSdkWidgetState> =
  {
    /** Calls a tool on your MCP. Returns the full response. */
    callTool: <
      ToolArgs extends CallToolArgs = null,
      ToolResponse extends CallToolResponse = CallToolResponse,
    >(
      name: string,
      args: ToolArgs,
    ) => Promise<ToolResponse>;

    /** Triggers a followup turn in the ChatGPT conversation */
    sendFollowUpMessage: (args: { prompt: string }) => Promise<void>;

    /** Opens an external link, redirects web page or mobile app */
    openExternal(args: { href: string; redirectUrl?: false }): void;

    /** For transitioning an app from inline to fullscreen or pip */
    requestDisplayMode: (args: { mode: RequestDisplayMode }) => Promise<{
      /**
       * The granted display mode. The host may reject the request.
       * For mobile, PiP is always coerced to fullscreen.
       */
      mode: RequestDisplayMode;
    }>;

    /**
     * Sets the widget state.
     * This state is persisted across widget renders.
     */
    setWidgetState: (state: WS) => Promise<void>;

    /**
     * Opens a modal portaled outside of the widget iFrame.
     * This ensures the modal is correctly displayed and not limited to the widget's area.
     */
    requestModal: (args: RequestModalOptions) => Promise<void>;

    /** Uploads a new file to the host. Pass `{ library: true }` to also save to the user's ChatGPT file library. */
    uploadFile: (
      file: File,
      options?: UploadFileOptions,
    ) => Promise<FileMetadata>;

    /**
     * Opens ChatGPT's file library picker and returns app-authorized files.
     * Feature-detect before using: this method may not be available on all host versions.
     */
    selectFiles?: () => Promise<FileMetadata[]>;

    /**
     * Downloads a file from the host. Works for files uploaded by the widget,
     * files selected via selectFiles(), or files provided via tool/file params.
     */
    getFileDownloadUrl: (
      file: FileMetadata,
    ) => Promise<{ downloadUrl: string }>;

    /**
     * Sets the open in app URL.
     * This URL will be opened in the app when the user clicks on the top right button in fullscreen mode.
     */
    setOpenInAppUrl: (args: { href: string }) => Promise<void>;
  };

// Dispatched when any global changes in the host page
export const SET_GLOBALS_EVENT_TYPE = "openai:set_globals";
export class SetGlobalsEvent extends CustomEvent<{
  globals: Partial<AppsSdkContext>;
}> {
  override readonly type = SET_GLOBALS_EVENT_TYPE;
}

type View = {
  mode: DisplayMode;
  params?: Record<string, unknown>;
};

type Theme = "light" | "dark";

type SafeAreaInsets = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

type SafeArea = {
  insets: SafeAreaInsets;
};

type DeviceType = "mobile" | "tablet" | "desktop" | "unknown";

type UserAgent = {
  device: { type: DeviceType };
  capabilities: {
    hover: boolean;
    touch: boolean;
  };
};
