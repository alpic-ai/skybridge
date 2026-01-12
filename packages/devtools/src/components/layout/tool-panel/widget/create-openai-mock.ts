import { assign, cloneDeep } from "lodash-es";
import type {
  CallToolArgs,
  CallToolResponse,
  DisplayMode,
  OpenAiMethods,
  OpenAiProperties,
  UnknownObject,
} from "skybridge/web";
import { SET_GLOBALS_EVENT_TYPE, SetGlobalsEvent } from "skybridge/web";

function createOpenaiMethods(
  openai: OpenAiProperties & OpenAiMethods<UnknownObject>,
  log: (
    command: string,
    args: UnknownObject,
    type?: "default" | "response",
  ) => void,
  setValue: (key: keyof OpenAiProperties, value: unknown) => void,
  callToolFn: (name: string, args: CallToolArgs) => Promise<CallToolResponse>,
) {
  const functions = {
    callTool: async <
      ToolArgs extends CallToolArgs = null,
      ToolResponse extends CallToolResponse = CallToolResponse,
    >(
      name: string,
      args: ToolArgs,
    ): Promise<ToolResponse> => {
      log("callTool", { name, args });

      const response = await callToolFn(name, args ?? {});
      log("← callTool response", response, "response");
      return response as unknown as ToolResponse;
    },
    sendFollowUpMessage: async (args: { prompt: string }) => {
      log("sendFollowUpMessage", args);
    },
    openExternal: (args: { href: string }) => {
      log("openExternal", args);
    },
    requestDisplayMode: async (args: { mode: DisplayMode }) => {
      log("requestDisplayMode", args);
      openai.displayMode = args.mode;
      setValue("displayMode", args.mode);
      return {
        mode: args.mode,
      };
    },
    setWidgetState: async (state: UnknownObject) => {
      log("setWidgetState", state);
      openai.widgetState = state;
      setValue("widgetState", state);
    },
    requestModal: async (args: { title?: string }) => {
      log("requestModal", args);
      openai.displayMode = "modal" as DisplayMode; // TODO: To remove once https://github.com/alpic-ai/skybridge/pull/92 is merged
      openai.view = { mode: "modal" };
      setValue("displayMode", "modal");
    },
    uploadFile: async (file: File) => {
      log("uploadFile", { name: file.name, size: file.size });
      return {
        fileId: "123",
      };
    },
    getFileDownloadUrl: async (file: { fileId: string }) => {
      log("getFileDownloadUrl", file);
      return {
        downloadUrl: "https://example.com/file.pdf",
      };
    },
  } satisfies OpenAiMethods<UnknownObject>;

  return functions;
}

function createOpenaiObject(
  initialValues: OpenAiProperties | null,
  iframeWindow: Window,
) {
  const globalPropertyKeys: (keyof OpenAiProperties)[] = [
    "theme",
    "userAgent",
    "locale",
    "maxHeight",
    "displayMode",
    "safeArea",
    "toolInput",
    "toolOutput",
    "toolResponseMetadata",
    "view",
    "widgetState",
  ];

  return new Proxy(initialValues || {}, {
    set(target, prop, value, receiver) {
      const result = Reflect.set(target, prop, value, receiver);

      if (globalPropertyKeys.includes(prop as keyof OpenAiProperties)) {
        const event = new SetGlobalsEvent(SET_GLOBALS_EVENT_TYPE, {
          detail: { globals: { [prop]: value } },
        });
        iframeWindow.dispatchEvent(event);
      }

      return result;
    },
  });
}

export function createAndInjectOpenAi(
  iframeWindow: Window & { openai?: unknown },
  initialValues: OpenAiProperties | null,
  log: (
    command: string,
    args: UnknownObject,
    type?: "default" | "response",
  ) => void,
  setValue: (key: keyof OpenAiProperties, value: unknown) => void,
  callToolFn: (name: string, args: CallToolArgs) => Promise<CallToolResponse>,
): void {
  const openaiObject = cloneDeep(initialValues);
  const openai = createOpenaiObject(openaiObject, iframeWindow);
  const functions = createOpenaiMethods(
    openai as OpenAiProperties & OpenAiMethods<UnknownObject>,
    log,
    setValue,
    callToolFn,
  );
  assign(openai, functions);
  iframeWindow.openai = openai as unknown as typeof iframeWindow.openai;
}
