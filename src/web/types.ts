export type UnknownObject = Record<string, unknown>;

type WidgetState = UnknownObject;

export const TOOL_RESPONSE_EVENT_TYPE = "openai:tool_response";
export class ToolResponseEvent extends CustomEvent<{
  tool: { name: string; args: UnknownObject };
}> {
  override readonly type = TOOL_RESPONSE_EVENT_TYPE;
}

declare global {
  interface Window {
    openai: API<WidgetState> & OpenAiGlobals;
  }

  interface WindowEventMap {
    [SET_GLOBALS_EVENT_TYPE]: SetGlobalsEvent;
  }
}

export type OpenAiGlobals<
  ToolInput extends UnknownObject = {},
  ToolOutput extends UnknownObject = UnknownObject,
  ToolResponseMetadata extends UnknownObject = UnknownObject,
  WidgetState extends UnknownObject = UnknownObject
> = {
  theme: Theme;
  userAgent: UserAgent;
  locale: string;

  // layout
  maxHeight: number;
  displayMode: DisplayMode;
  safeArea: SafeArea;

  // state
  toolInput: ToolInput;
  toolOutput: ToolOutput | { text: string } | null;
  toolResponseMetadata: ToolResponseMetadata | null;
  widgetState: WidgetState | null;
};

export type CallToolArgs = Record<string, unknown> | null;

export type CallToolResponse = {
  content: {
    type: "text";
    text: string;
  }[];
  structuredContent: Record<string, unknown>;
  isError: boolean;
  result: string;
  meta: Record<string, unknown>;
};

type API<WidgetState extends UnknownObject> = {
  /** Calls a tool on your MCP. Returns the full response. */
  callTool: <
    ToolArgs extends CallToolArgs = null,
    ToolResponse extends CallToolResponse = CallToolResponse
  >(
    name: string,
    args: ToolArgs
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
  requestModal: (args: { title: string }) => Promise<void>;
};

// Dispatched when any global changes in the host page
export const SET_GLOBALS_EVENT_TYPE = "openai:set_globals";
export class SetGlobalsEvent extends CustomEvent<{
  globals: Partial<OpenAiGlobals>;
}> {
  override readonly type = SET_GLOBALS_EVENT_TYPE;
}

export type CallTool = (
  name: string,
  args: Record<string, unknown>
) => Promise<CallToolResponse>;

export type DisplayMode = "pip" | "inline" | "fullscreen";

export type Theme = "light" | "dark";

export type SafeAreaInsets = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export type SafeArea = {
  insets: SafeAreaInsets;
};

export type DeviceType = "mobile" | "tablet" | "desktop" | "unknown";

export type UserAgent = {
  device: { type: DeviceType };
  capabilities: {
    hover: boolean;
    touch: boolean;
  };
};
