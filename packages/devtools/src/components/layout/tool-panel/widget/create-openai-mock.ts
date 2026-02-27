import { assign, cloneDeep } from "lodash-es";
import type {
  AppsSdkContext,
  AppsSdkMethods,
  CallToolArgs,
  CallToolResponse,
  DisplayMode,
  UnknownObject,
} from "skybridge/web";

type OpenAIWidgetState = { modelContent: Record<string, unknown> };

import { SET_GLOBALS_EVENT_TYPE, SetGlobalsEvent } from "skybridge/web";

function createOpenaiMethods(
  openai: AppsSdkContext & AppsSdkMethods,
  log: (
    command: string,
    args: UnknownObject,
    type?: "default" | "response",
  ) => void,
  setValue: (key: keyof AppsSdkContext, value: unknown) => void,
  callToolFn: (name: string, args: CallToolArgs) => Promise<CallToolResponse>,
  setOpenInAppUrlFn: (href: string) => void,
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
    openExternal: (args: { href: string; redirectUrl?: false }) => {
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
    setWidgetState: async (state: OpenAIWidgetState) => {
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
    setOpenInAppUrl: async (args: { href: string }) => {
      log("setOpenInAppUrl", args);
      setOpenInAppUrlFn(args.href);
    },
  } satisfies AppsSdkMethods;

  return functions;
}

function createOpenaiObject(
  initialValues: AppsSdkContext | null,
  iframeWindow: Window,
) {
  const globalPropertyKeys: (keyof AppsSdkContext)[] = [
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

      if (globalPropertyKeys.includes(prop as keyof AppsSdkContext)) {
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
  initialValues: AppsSdkContext | null,
  log: (
    command: string,
    args: UnknownObject,
    type?: "default" | "response",
  ) => void,
  setValue: (key: keyof AppsSdkContext, value: unknown) => void,
  callToolFn: (name: string, args: CallToolArgs) => Promise<CallToolResponse>,
  setOpenInAppUrlFn: (href: string) => void,
): void {
  const openaiObject = cloneDeep(initialValues);
  const openai = createOpenaiObject(openaiObject, iframeWindow);
  const functions = createOpenaiMethods(
    openai as AppsSdkContext & AppsSdkMethods,
    log,
    setValue,
    callToolFn,
    setOpenInAppUrlFn,
  );
  assign(openai, functions);
  iframeWindow.openai = openai as unknown as typeof iframeWindow.openai;
}
