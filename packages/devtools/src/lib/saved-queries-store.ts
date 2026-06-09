import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SavedQuery = {
  key: string;
  input: Record<string, unknown>;
  createdAt: number;
};

// serverName -> toolName -> queries
type SavedQueriesByTool = Record<string, SavedQuery[]>;
type SavedQueriesByServer = Record<string, SavedQueriesByTool>;

type SavedQueriesState = {
  queries: SavedQueriesByServer;
  /** Persist the current input under a new key. */
  saveQuery: (
    serverName: string,
    toolName: string,
    key: string,
    input: Record<string, unknown>,
  ) => void;
  /** Overwrite the input of an existing saved query (matched by key). */
  updateQuery: (
    serverName: string,
    toolName: string,
    key: string,
    input: Record<string, unknown>,
  ) => void;
  deleteQuery: (serverName: string, toolName: string, key: string) => void;
};

const EMPTY: SavedQuery[] = [];

export const useSavedQueriesStore = create<SavedQueriesState>()(
  persist(
    (set) => ({
      queries: {},
      saveQuery: (serverName, toolName, key, input) =>
        set((state) => {
          const forServer = state.queries[serverName] ?? {};
          const forTool = forServer[toolName] ?? [];
          const query: SavedQuery = { key, input, createdAt: Date.now() };
          return {
            queries: {
              ...state.queries,
              [serverName]: { ...forServer, [toolName]: [...forTool, query] },
            },
          };
        }),
      updateQuery: (serverName, toolName, key, input) =>
        set((state) => {
          const forServer = state.queries[serverName];
          const forTool = forServer?.[toolName];
          if (!forTool) {
            return state;
          }
          const index = forTool.findIndex((q) => q.key === key);
          if (index === -1) {
            return state;
          }
          const next = [...forTool];
          next[index] = { ...next[index], input };
          return {
            queries: {
              ...state.queries,
              [serverName]: { ...forServer, [toolName]: next },
            },
          };
        }),
      deleteQuery: (serverName, toolName, key) =>
        set((state) => {
          const forServer = state.queries[serverName];
          const forTool = forServer?.[toolName];
          if (!forTool) {
            return state;
          }
          return {
            queries: {
              ...state.queries,
              [serverName]: {
                ...forServer,
                [toolName]: forTool.filter((q) => q.key !== key),
              },
            },
          };
        }),
    }),
    {
      name: "skybridge-devtools-saved-queries",
      version: 1,
      partialize: (state) => ({ queries: state.queries }),
    },
  ),
);

/** A tool's saved queries (stable empty array when none). */
export const useSavedQueries = (
  serverName: string | undefined,
  toolName: string,
): SavedQuery[] =>
  useSavedQueriesStore((s) =>
    serverName ? (s.queries[serverName]?.[toolName] ?? EMPTY) : EMPTY,
  );
