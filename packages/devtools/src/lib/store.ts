import { set as lodashSet, merge } from "lodash-es";
import type {
  CallToolResponse,
  OpenAiProperties,
  UnknownObject,
} from "skybridge/web";
import { create } from "zustand";

export type OpenAiLog = {
  id: string;
  timestamp: number;
  command: string;
  args: UnknownObject;
};

type ToolData = {
  input: Record<string, unknown>;
  response: CallToolResponse;
  openaiRef: React.RefObject<HTMLIFrameElement> | null;
  openaiLogs: OpenAiLog[];
  openaiObject: OpenAiProperties | null;
};

export type Store = {
  selectedTool: string | null;
  setSelectedTool: (tool: string | null) => void;
  tools: {
    [name: string]: ToolData;
  };
  setToolData: (tool: string, data: Partial<ToolData>) => void;
  pushOpenAiLog: (tool: string, log: Omit<OpenAiLog, "id">) => void;
  updateOpenaiObject: (
    tool: string,
    key: keyof OpenAiProperties,
    value: unknown,
  ) => void;
};

export const useStore = create<Store>()((set) => ({
  selectedTool: null,
  setSelectedTool: (tool: string | null) => set({ selectedTool: tool }),
  tools: {},
  setToolData: (tool: string, data: Partial<ToolData>) =>
    set((state) => ({
      tools: { ...state.tools, [tool]: { ...state.tools[tool], ...data } },
    })),
  updateOpenaiObject: (
    tool: string,
    key: keyof OpenAiProperties,
    value: unknown,
  ) =>
    set((state) => {
      const updatedOpenaiObject = state.tools[tool]?.openaiObject;

      if (!updatedOpenaiObject) {
        return state;
      }

      lodashSet(updatedOpenaiObject, key, value);

      return {
        tools: {
          ...state.tools,
          [tool]: {
            ...state.tools[tool],
            openaiObject: updatedOpenaiObject,
          },
        },
      };
    }),
  pushOpenAiLog: (tool: string, log: Omit<OpenAiLog, "id">) =>
    set((state) => ({
      tools: {
        ...state.tools,
        [tool]: merge({}, state.tools[tool], {
          openaiLogs: [
            ...(state.tools[tool]?.openaiLogs || []),
            { ...log, id: crypto.randomUUID() },
          ],
        }),
      },
    })),
}));

export const useCallToolResult = (toolName: string) => {
  const { tools } = useStore();
  return tools[toolName];
};
