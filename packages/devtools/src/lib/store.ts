import { cloneDeep, set } from "lodash-es";
import type {
  AppsSdkContext,
  CallToolResponse,
  UnknownObject,
} from "skybridge/web";
import { create } from "zustand";

export type OpenAiLog = {
  id: string;
  timestamp: number;
  source: "view" | "server";
  command: string;
  args: UnknownObject;
  type: "default" | "response";
};

type ToolData = {
  input: Record<string, unknown>;
  response: CallToolResponse;
  durationMs: number | null;
  openaiRef: React.RefObject<HTMLIFrameElement> | null;
  openaiLogs: OpenAiLog[];
  openaiObject: AppsSdkContext | null;
  openInAppUrl: string | null;
  // Key of the saved input the current form was loaded from (session-only).
  activeSavedInputKey?: string | null;
};

export type Store = {
  tools: {
    [name: string]: ToolData;
  };
  setToolData: (tool: string, data: Partial<ToolData>) => void;
  pushOpenAiLog: (tool: string, log: Omit<OpenAiLog, "id">) => void;
  clearOpenAiLogs: (tool: string) => void;
  updateOpenaiObject: (
    tool: string,
    key: keyof AppsSdkContext,
    value: unknown,
  ) => void;
  setOpenInAppUrl: (tool: string, href: string) => void;
};

export const useStore = create<Store>()((setState) => ({
  tools: {},
  setToolData: (tool: string, data: Partial<ToolData>) =>
    setState((state) => {
      const prev = state.tools[tool];
      if (prev) {
        let unchanged = true;
        for (const key of Object.keys(data) as (keyof ToolData)[]) {
          if (prev[key] !== data[key]) {
            unchanged = false;
            break;
          }
        }
        if (unchanged) {
          return state;
        }
      }
      return updateNestedState(state, `tools.${tool}`, {
        ...(prev ?? {}),
        ...data,
      });
    }),
  updateOpenaiObject: (
    tool: string,
    key: keyof AppsSdkContext,
    value: unknown,
  ) =>
    setState((state) => {
      if (!state.tools[tool]?.openaiObject) {
        return state;
      }
      return updateNestedState(
        state,
        `tools.${tool}.openaiObject.${key}`,
        value,
      );
    }),
  pushOpenAiLog: (tool: string, log: Omit<OpenAiLog, "id">) =>
    setState((state) => {
      const currentLogs = state.tools[tool]?.openaiLogs || [];
      return updateNestedState(state, `tools.${tool}.openaiLogs`, [
        ...currentLogs,
        { ...log, id: crypto.randomUUID() },
      ]);
    }),
  clearOpenAiLogs: (tool: string) =>
    setState((state) => {
      if (!state.tools[tool]?.openaiLogs?.length) {
        return state;
      }
      return updateNestedState(state, `tools.${tool}.openaiLogs`, []);
    }),
  setOpenInAppUrl: (tool: string, href: string) =>
    setState((state) => {
      if (state.tools[tool]?.openInAppUrl === href) {
        return state;
      }
      return updateNestedState(state, `tools.${tool}.openInAppUrl`, href);
    }),
}));

export const useCallToolResult = (toolName: string) => {
  const { tools } = useStore();
  return tools[toolName];
};

const updateNestedState = <T extends Record<string, unknown>>(
  state: T,
  path: string | string[],
  value: unknown,
): T => {
  const cloned = cloneDeep(state) as T;
  set(cloned, path, value);
  return cloned;
};
