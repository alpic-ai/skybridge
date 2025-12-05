import { create, type StateCreator } from "zustand";
import type { UnknownObject } from "./types.js";
import { SET_GLOBALS_EVENT_TYPE, type SetGlobalsEvent } from "./types.js";

const WIDGET_CONTEXT_KEY = "__widget_context" as const;

function filterWidgetContext<State extends UnknownObject>(
  state: State | null
): State | null {
  if (state === null) {
    return null;
  }

  const { [WIDGET_CONTEXT_KEY]: _, ...filteredState } = state as State & {
    [WIDGET_CONTEXT_KEY]?: unknown;
  };

  return filteredState as State;
}

function serializeState(value: unknown): unknown {
  if (typeof value === "function") {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => serializeState(item))
      .filter((item) => item !== undefined);
  }

  if (value !== null && typeof value === "object") {
    const serialized: UnknownObject = {};
    for (const [key, val] of Object.entries(value)) {
      const serializedValue = serializeState(val);
      if (serializedValue !== undefined) {
        serialized[key] = serializedValue;
      }
    }
    return serialized;
  }

  return value;
}

function preserveWidgetContext<State extends UnknownObject>(
  newState: State | null
): State | null {
  if (newState === null) {
    return null;
  }

  const currentWindowState = window.openai?.widgetState as
    | (State & { [WIDGET_CONTEXT_KEY]?: unknown })
    | null
    | undefined;

  if (
    currentWindowState !== null &&
    currentWindowState !== undefined &&
    WIDGET_CONTEXT_KEY in currentWindowState
  ) {
    return {
      ...newState,
      [WIDGET_CONTEXT_KEY]: currentWindowState[WIDGET_CONTEXT_KEY],
    } as State;
  }

  return newState;
}

function getInitialState<State extends UnknownObject>(
  defaultState?: State | (() => State)
): State | null {
  const widgetStateFromWindow = window.openai?.widgetState as
    | State
    | null
    | undefined;

  if (widgetStateFromWindow !== null && widgetStateFromWindow !== undefined) {
    return filterWidgetContext(widgetStateFromWindow);
  }

  return typeof defaultState === "function"
    ? defaultState()
    : defaultState ?? null;
}

export function createStore<State extends UnknownObject>(
  storeCreator: StateCreator<State, [], [], State>,
  defaultState?: State | (() => State)
) {
  const initialState = getInitialState(defaultState);

  const store = create<State>()(
    (...args: Parameters<StateCreator<State, [], [], State>>) => {
      const baseStore = storeCreator(...args);

      // Merge with initial state from window.openai.widgetState or defaultState
      if (initialState !== null) {
        return { ...baseStore, ...initialState };
      }

      return baseStore;
    }
  );

  // Subscribe to store changes and persist to window.openai.setWidgetState
  let isInternalUpdate = false;

  store.subscribe((state: State) => {
    if (!isInternalUpdate && window.openai) {
      // Only serialize the state data, not the methods
      const serializedState = serializeState(state) as UnknownObject;
      if (serializedState !== null && serializedState !== undefined) {
        const stateToPersist = preserveWidgetContext(serializedState as State);
        if (stateToPersist !== null) {
          window.openai.setWidgetState(stateToPersist);
        }
      }
    }
  });

  // Listen to external widgetState changes and update the store
  if (typeof window !== "undefined") {
    const handleSetGlobals = (event: SetGlobalsEvent) => {
      const widgetState = event.detail.globals.widgetState;
      if (widgetState !== undefined) {
        const filteredState = filterWidgetContext(widgetState as State | null);
        if (filteredState !== null) {
          isInternalUpdate = true;
          store.setState(filteredState);
          isInternalUpdate = false;
        }
      }
    };

    window.addEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobals, {
      passive: true,
    });
  }

  return store;
}
