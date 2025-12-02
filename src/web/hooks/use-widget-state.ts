import { useCallback, useEffect, useState, type SetStateAction } from "react";
import type { UnknownObject } from "../types.js";
import { useOpenAiGlobal } from "./use-openai-global.js";

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

export function useWidgetState<T extends UnknownObject>(
  defaultState: T | (() => T)
): readonly [T, (state: SetStateAction<T>) => void];
export function useWidgetState<T extends UnknownObject>(
  defaultState?: T | (() => T | null) | null
): readonly [T | null, (state: SetStateAction<T | null>) => void];
export function useWidgetState<T extends UnknownObject>(
  defaultState?: T | (() => T | null) | null
): readonly [T | null, (state: SetStateAction<T | null>) => void] {
  const widgetStateFromWindow = useOpenAiGlobal("widgetState") as T;

  const [widgetState, _setWidgetState] = useState<T | null>(() => {
    if (widgetStateFromWindow !== null) {
      return filterWidgetContext(widgetStateFromWindow);
    }

    return typeof defaultState === "function"
      ? defaultState()
      : defaultState ?? null;
  });

  useEffect(() => {
    // Fixes openai implementation bug
    if (widgetStateFromWindow !== null) {
      _setWidgetState(filterWidgetContext(widgetStateFromWindow));
    }
  }, [widgetStateFromWindow]);

  const setWidgetState = useCallback((state: SetStateAction<T | null>) => {
    _setWidgetState((prevState) => {
      const newState = typeof state === "function" ? state(prevState) : state;
      const stateToSet = preserveWidgetContext(newState);

      if (stateToSet !== null) {
        window.openai.setWidgetState(stateToSet);
      }

      return filterWidgetContext(stateToSet);
    });
  }, []);

  return [widgetState, setWidgetState] as const;
}
