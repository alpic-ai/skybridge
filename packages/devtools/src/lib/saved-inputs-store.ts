import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SavedInput = {
  key: string;
  input: Record<string, unknown>;
  createdAt: number;
};

// serverName -> toolName -> saved inputs
type SavedInputsByTool = Record<string, SavedInput[]>;
type SavedInputsByServer = Record<string, SavedInputsByTool>;

type SavedInputsState = {
  inputs: SavedInputsByServer;
  /** Persist the current input under a new key. */
  saveInput: (
    serverName: string,
    toolName: string,
    key: string,
    input: Record<string, unknown>,
  ) => void;
  /** Overwrite an existing saved input (matched by key). */
  updateInput: (
    serverName: string,
    toolName: string,
    key: string,
    input: Record<string, unknown>,
  ) => void;
  deleteInput: (serverName: string, toolName: string, key: string) => void;
};

const EMPTY: SavedInput[] = [];

export const useSavedInputsStore = create<SavedInputsState>()(
  persist(
    (set) => ({
      inputs: {},
      saveInput: (serverName, toolName, key, input) =>
        set((state) => {
          const forServer = state.inputs[serverName] ?? {};
          const forTool = forServer[toolName] ?? [];
          const saved: SavedInput = { key, input, createdAt: Date.now() };
          return {
            inputs: {
              ...state.inputs,
              [serverName]: { ...forServer, [toolName]: [...forTool, saved] },
            },
          };
        }),
      updateInput: (serverName, toolName, key, input) =>
        set((state) => {
          const forServer = state.inputs[serverName];
          const forTool = forServer?.[toolName];
          if (!forTool) {
            return state;
          }
          const index = forTool.findIndex((s) => s.key === key);
          if (index === -1) {
            return state;
          }
          const next = [...forTool];
          next[index] = { ...next[index], input };
          return {
            inputs: {
              ...state.inputs,
              [serverName]: { ...forServer, [toolName]: next },
            },
          };
        }),
      deleteInput: (serverName, toolName, key) =>
        set((state) => {
          const forServer = state.inputs[serverName];
          const forTool = forServer?.[toolName];
          if (!forTool) {
            return state;
          }
          return {
            inputs: {
              ...state.inputs,
              [serverName]: {
                ...forServer,
                [toolName]: forTool.filter((s) => s.key !== key),
              },
            },
          };
        }),
    }),
    {
      name: "skybridge-devtools-saved-inputs",
      version: 1,
      partialize: (state) => ({ inputs: state.inputs }),
    },
  ),
);

/** A tool's saved inputs (stable empty array when none). */
export const useSavedInputs = (
  serverName: string | undefined,
  toolName: string,
): SavedInput[] =>
  useSavedInputsStore((s) =>
    serverName ? (s.inputs[serverName]?.[toolName] ?? EMPTY) : EMPTY,
  );
