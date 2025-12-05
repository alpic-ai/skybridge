import { WIDGET_CONTEXT_KEY } from "../data-llm.js";
import type { UnknownObject } from "../types.js";
import superjson from "superjson";

export function filterWidgetContext<T extends UnknownObject>(
  state?: T | null
): T | null {
  if (state === null) {
    return null;
  }

  const { [WIDGET_CONTEXT_KEY]: _, ...filteredState } = state as T & {
    [WIDGET_CONTEXT_KEY]?: unknown;
  };

  return filteredState as T;
}

export function injectWidgetContext<T extends UnknownObject>(
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

export function serializeState(value: unknown): unknown {
  return superjson.serialize(value).json;
}

export function getInitialState<State extends UnknownObject>(
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
