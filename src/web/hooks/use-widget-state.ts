import { type SetStateAction, useCallback, useEffect, useState } from "react";
import { useAppsSdkBridge } from "../bridges/use-apps-sdk-bridge.js";
import { filterWidgetContext, injectWidgetContext } from "../helpers/state.js";
import type { UnknownObject } from "../types.js";

export function useWidgetState<T extends UnknownObject>(
  defaultState: T | (() => T),
): readonly [T, (state: SetStateAction<T>) => void];
export function useWidgetState<T extends UnknownObject>(
  defaultState?: T | (() => T | null) | null,
): readonly [T | null, (state: SetStateAction<T | null>) => void];
export function useWidgetState<T extends UnknownObject>(
  defaultState?: T | (() => T | null) | null,
): readonly [T | null, (state: SetStateAction<T | null>) => void] {
  const widgetStateFromWindow = useAppsSdkBridge("widgetState") as T | null;

  const [widgetState, _setWidgetState] = useState<T | null>(() => {
    if (widgetStateFromWindow !== null) {
      return filterWidgetContext(widgetStateFromWindow);
    }

    return typeof defaultState === "function"
      ? defaultState()
      : (defaultState ?? null);
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
      const stateToSet = injectWidgetContext(newState);

      if (stateToSet !== null) {
        window.openai.setWidgetState(stateToSet);
      }

      return filterWidgetContext(stateToSet);
    });
  }, []);

  return [widgetState, setWidgetState] as const;
}
