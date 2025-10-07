type UnknownObject = Record<string, unknown>;

export type WidgetState = UnknownObject;

export type SetWidgetState = (state: WidgetState) => Promise<void>;

export type Theme = "light" | "dark";

export type DisplayMode = "pip" | "inline" | "fullscreen";

export type CallToolResponse = {
  result: string;
};

export type CallTool = (
  name: string,
  args: Record<string, unknown>
) => Promise<CallToolResponse>;

export type OpenaiGlobals = {
  theme: Theme;
  maxHeight: number;
  displayMode: DisplayMode;
  toolInput: UnknownObject;
  toolOutput: UnknownObject;
  widgetState: UnknownObject | null;
  setWidgetState: SetWidgetState;
};

export type SendFollowUpMessage = (args: { prompt: string }) => Promise<void>;

export type RequestDisplayMode = (args: { mode: DisplayMode }) => Promise<{
  mode: DisplayMode;
}>;

type API = {
  callTool: CallTool;
  sendFollowUpMessage: SendFollowUpMessage;
  requestDisplayMode: RequestDisplayMode;
};

export const SET_GLOBALS_EVENT_TYPE = "openai:set_globals";
export class SetGlobalsEvent extends CustomEvent<{
  globals: Partial<OpenaiGlobals>;
}> {
  readonly type = SET_GLOBALS_EVENT_TYPE;
}

export const TOOL_RESPONSE_EVENT_TYPE = "openai:tool_response";
export class ToolResponseEvent extends CustomEvent<{
  tool: { name: string; args: UnknownObject };
}> {
  readonly type = TOOL_RESPONSE_EVENT_TYPE;
}

declare global {
  interface Window {
    openai: API & OpenaiGlobals;
  }

  interface WindowEventMap {
    [SET_GLOBALS_EVENT_TYPE]: SetGlobalsEvent;
    [TOOL_RESPONSE_EVENT_TYPE]: ToolResponseEvent;
  }
}
