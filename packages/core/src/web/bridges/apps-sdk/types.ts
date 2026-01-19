import type { UnknownObject } from "../../types.js";
import type {
  CallToolArgs,
  CallToolResponse,
  FileMetadata,
  RequestModalOptions,
} from "../types.js";

type DisplayMode = "pip" | "inline" | "fullscreen" | "modal";

type WidgetState = UnknownObject;

export const TOOL_RESPONSE_EVENT_TYPE = "openai:tool_response";
export class ToolResponseEvent extends CustomEvent<{
  tool: { name: string; args: UnknownObject };
}> {
  override readonly type = TOOL_RESPONSE_EVENT_TYPE;
}

declare global {
  interface Window {
    openai: AppsSdkMethods<WidgetState> & AppsSdkContext;
  }

  interface WindowEventMap {
    [SET_GLOBALS_EVENT_TYPE]: SetGlobalsEvent;
  }
}

export type AppsSdkContext<
  ToolInput extends UnknownObject = Record<never, unknown>,
  ToolOutput extends UnknownObject = UnknownObject,
  ToolResponseMetadata extends UnknownObject = UnknownObject,
  WidgetState extends UnknownObject = UnknownObject,
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
  widgetState: WidgetState | null;
};

export type AppsSdkMethods<WidgetState extends UnknownObject = UnknownObject> =
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
    openExternal(args: { href: string }): void;

    /** For transitioning an app from inline to fullscreen or pip */
    requestDisplayMode: (args: { mode: DisplayMode }) => Promise<{
      /**
       * The granted display mode. The host may reject the request.
       * For mobile, PiP is always coerced to fullscreen.
       */
      mode: DisplayMode;
    }>;

    /**
     * Sets the widget state.
     * This state is persisted across widget renders.
     */
    setWidgetState: (state: WidgetState) => Promise<void>;

    /**
     * Opens a modal portaled outside of the widget iFrame.
     * This ensures the modal is correctly displayed and not limited to the widget's area.
     */
    requestModal: (args: RequestModalOptions) => Promise<void>;

    /** Uploads a new file to the host */
    uploadFile: (file: File) => Promise<FileMetadata>;

    /**
     * Downloads a file from the host that was previously uploaded.
     * Only files uploaded by the same connector instance can be downloaded.
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
