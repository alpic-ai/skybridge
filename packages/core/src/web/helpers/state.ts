import superjson, { type SuperJSONResult } from "superjson";
import { getAdaptor } from "../bridges/index.js";
import { VIEW_CONTEXT_KEY } from "../data-llm.js";
import type { UnknownObject } from "../types.js";

export function filterViewContext<T extends UnknownObject>(
  state?: T | null,
): T | null {
  if (state === null || state === undefined) {
    return null;
  }

  const { [VIEW_CONTEXT_KEY]: _, ...filteredState } = state as T & {
    [VIEW_CONTEXT_KEY]?: unknown;
  };

  return filteredState as T;
}

export function injectViewContext<T extends UnknownObject>(
  newState: T | null,
): T | null {
  if (newState === null) {
    return null;
  }

  const currentState = getAdaptor()
    .getHostContextStore("viewState")
    .getSnapshot() as (T & { [VIEW_CONTEXT_KEY]?: unknown }) | null;

  if (
    currentState !== null &&
    currentState !== undefined &&
    VIEW_CONTEXT_KEY in currentState
  ) {
    return {
      ...newState,
      [VIEW_CONTEXT_KEY]: currentState[VIEW_CONTEXT_KEY],
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
  const viewState = getAdaptor()
    .getHostContextStore("viewState")
    .getSnapshot() as State | null;

  if (viewState !== null && viewState !== undefined) {
    return filterViewContext(viewState);
  }

  return typeof defaultState === "function"
    ? defaultState()
    : (defaultState ?? null);
}
