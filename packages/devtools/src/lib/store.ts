import { cloneDeep, set } from "lodash-es";
import type {
  AppsSdkProperties,
  CallToolResponse,
  UnknownObject,
} from "skybridge/web";
import { create } from "zustand";

export type OpenAiLog = {
  id: string;
  timestamp: number;
  command: string;
  args: UnknownObject;
  type: "default" | "response";
};

type ToolData = {
  input: Record<string, unknown>;
  response: CallToolResponse;
  openaiRef: React.RefObject<HTMLIFrameElement> | null;
  openaiLogs: OpenAiLog[];
  openaiObject: AppsSdkProperties | null;
};

export type Store = {
  tools: {
    [name: string]: ToolData;
  };
  setToolData: (tool: string, data: Partial<ToolData>) => void;
  pushOpenAiLog: (tool: string, log: Omit<OpenAiLog, "id">) => void;
  updateOpenaiObject: (
    tool: string,
    key: keyof AppsSdkProperties,
    value: unknown,
  ) => void;
};

export const useStore = create<Store>()((setState) => ({
  tools: {},
  setToolData: (tool: string, data: Partial<ToolData>) =>
    setState((state) =>
      updateNestedState(state, `tools.${tool}`, {
        ...state.tools[tool],
        ...data,
      }),
    ),
  updateOpenaiObject: (
    tool: string,
    key: keyof AppsSdkProperties,
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
