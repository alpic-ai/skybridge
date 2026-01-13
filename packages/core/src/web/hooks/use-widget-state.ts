import { type SetStateAction, useCallback, useEffect, useState } from "react";
import { getAdaptor, useBridge } from "../bridges/index.js";
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
  const adaptor = getAdaptor();
  const widgetStateFromBridge = useBridge("widgetState") as T | null;

  const [widgetState, _setWidgetState] = useState<T | null>(() => {
    if (widgetStateFromBridge !== null) {
      return filterWidgetContext(widgetStateFromBridge);
    }

    return typeof defaultState === "function"
      ? defaultState()
      : (defaultState ?? null);
  });

  useEffect(() => {
    if (widgetStateFromBridge !== null) {
      _setWidgetState(filterWidgetContext(widgetStateFromBridge));
    }
  }, [widgetStateFromBridge]);

  const setWidgetState = useCallback(
    (state: SetStateAction<T | null>) => {
      _setWidgetState((prevState) => {
        const newState = typeof state === "function" ? state(prevState) : state;
        const stateToSet = injectWidgetContext(newState);

        if (stateToSet !== null) {
          adaptor.setWidgetState(stateToSet);
        }

        return filterWidgetContext(stateToSet);
      });
    },
    [adaptor],
  );

  return [widgetState, setWidgetState] as const;
}
