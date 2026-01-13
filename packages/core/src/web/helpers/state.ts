import superjson, { type SuperJSONResult } from "superjson";
import { getAdaptor } from "../bridges/index.js";
import { WIDGET_CONTEXT_KEY } from "../data-llm.js";
import type { UnknownObject } from "../types.js";

export function filterWidgetContext<T extends UnknownObject>(
  state?: T | null,
): T | null {
  if (state === null || state === undefined) {
    return null;
  }

  const { [WIDGET_CONTEXT_KEY]: _, ...filteredState } = state as T & {
    [WIDGET_CONTEXT_KEY]?: unknown;
  };

  return filteredState as T;
}

export function injectWidgetContext<T extends UnknownObject>(
  newState: T | null,
): T | null {
  if (newState === null) {
    return null;
  }

  const currentState = getAdaptor()
    .getHostContextStore("widgetState")
    .getSnapshot() as (T & { [WIDGET_CONTEXT_KEY]?: unknown }) | null;

  if (
    currentState !== null &&
    currentState !== undefined &&
    WIDGET_CONTEXT_KEY in currentState
  ) {
    return {
      ...newState,
      [WIDGET_CONTEXT_KEY]: currentState[WIDGET_CONTEXT_KEY],
    } as T;
  }

  return newState;
}

export function serializeState(value: UnknownObject) {
  return superjson.parse(superjson.stringify(value)); // Strips functions
}

export function deserializeState(value: SuperJSONResult): unknown {
  return superjson.deserialize(value);
}

export function getInitialState<State extends UnknownObject>(
  defaultState?: State | (() => State),
): State | null {
  const widgetState = getAdaptor()
    .getHostContextStore("widgetState")
    .getSnapshot() as State | null;

  if (widgetState !== null && widgetState !== undefined) {
    return filterWidgetContext(widgetState);
  }

  return typeof defaultState === "function"
    ? defaultState()
    : (defaultState ?? null);
}
