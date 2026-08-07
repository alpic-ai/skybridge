import { assign, cloneDeep } from "lodash-es";
import type {
  AppsSdkContext,
  AppsSdkMethods,
  AppsSdkWidgetState,
  CallToolArgs,
  CallToolResponse,
  DisplayMode,
  RequestDisplayMode,
  RequestModalOptions,
  UnknownObject,
} from "skybridge/web";

import { SET_GLOBALS_EVENT_TYPE, SetGlobalsEvent } from "skybridge/web";
import { warnOnLargeViewState } from "@/lib/context-warnings.js";
import { useInspectorPreferencesStore } from "@/lib/inspector-preferences-store.js";

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
    requestClose: async () => {
      log("requestClose", {});
    },
    openExternal: (args: { href: string; redirectUrl?: false }) => {
      window.open(args.href, "_blank", "noopener,noreferrer");
      log("openExternal", args);
    },
    requestDisplayMode: async (args: { mode: RequestDisplayMode }) => {
      log("requestDisplayMode", args);
      const state = useInspectorPreferencesStore.getState();
      const mode =
        state.previewClient === "claude" && args.mode === "pip"
          ? state.displayMode === "modal"
            ? "inline"
            : state.displayMode
          : args.mode;
      openai.displayMode = mode;
      setValue("displayMode", mode);
      state.setPreference("displayMode", mode);
      return {
        mode,
      };
    },
    setWidgetState: async (state: AppsSdkWidgetState) => {
      warnOnLargeViewState(state.modelContent, "setWidgetState");
      log("setWidgetState", state);
      openai.widgetState = state;
      setValue("widgetState", state);
    },
    requestModal: async (args: RequestModalOptions) => {
      log("requestModal", args);
      openai.displayMode = "modal" as DisplayMode; // TODO: To remove once https://github.com/alpic-ai/skybridge/pull/92 is merged
      openai.view = { mode: "modal", params: args.params };
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
