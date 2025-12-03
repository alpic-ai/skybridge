import { create, type StateCreator } from "zustand";
import type { UnknownObject } from "./types.js";
import { SET_GLOBALS_EVENT_TYPE, type SetGlobalsEvent } from "./types.js";

const WIDGET_CONTEXT_KEY = "__widget_context" as const;

function filterWidgetContext<T extends UnknownObject>(
  state: T | null
): T | null {
  if (state === null) {
    return null;
  }

  const { [WIDGET_CONTEXT_KEY]: _, ...filteredState } = state as T & {
    [WIDGET_CONTEXT_KEY]?: unknown;
  };

  return filteredState as T;
}

function serializeState(value: unknown): unknown {
  // Skip functions (methods)
  if (typeof value === "function") {
    return undefined;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value
      .map((item) => serializeState(item))
      .filter((item) => item !== undefined);
  }

  // Handle objects
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

  // Primitive values
  return value;
}

function preserveWidgetContext<T extends UnknownObject>(
  newState: T | null
): T | null {
  if (newState === null) {
    return null;
  }

  const currentWindowState = window.openai?.widgetState as
    | (T & { [WIDGET_CONTEXT_KEY]?: unknown })
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
    } as T;
  }

  return newState;
}

function getInitialState<T extends UnknownObject>(
  defaultState?: T | (() => T)
): T | null {
  const widgetStateFromWindow = window.openai?.widgetState as
    | T
    | null
    | undefined;

  if (widgetStateFromWindow !== null && widgetStateFromWindow !== undefined) {
    return filterWidgetContext(widgetStateFromWindow);
  }

  return typeof defaultState === "function"
    ? defaultState()
    : defaultState ?? null;
}

export function createStore<T extends UnknownObject>(
  storeCreator: StateCreator<T, [], [], T>,
  defaultState?: T | (() => T)
) {
  const initialState = getInitialState(defaultState);

  const store = create<T>()(
    (...args: Parameters<StateCreator<T, [], [], T>>) => {
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

  store.subscribe((state: T) => {
    if (!isInternalUpdate && window.openai) {
      // Only serialize the state data, not the methods
      const serializedState = serializeState(state) as UnknownObject;
      if (serializedState !== null && serializedState !== undefined) {
        const stateToPersist = preserveWidgetContext(serializedState as T);
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
        const filteredState = filterWidgetContext(widgetState as T | null);
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
