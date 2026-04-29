import { type SetStateAction, useCallback, useEffect, useState } from "react";
import { getAdaptor, useHostContext } from "../bridges/index.js";
import { filterViewContext, injectViewContext } from "../helpers/state.js";
import type { UnknownObject } from "../types.js";

export function useViewState<T extends UnknownObject>(
  defaultState: T | (() => T),
): readonly [T, (state: SetStateAction<T>) => void];
export function useViewState<T extends UnknownObject>(
  defaultState?: T | (() => T | null) | null,
): readonly [T | null, (state: SetStateAction<T | null>) => void];
export function useViewState<T extends UnknownObject>(
  defaultState?: T | (() => T | null) | null,
): readonly [T | null, (state: SetStateAction<T | null>) => void] {
  const adaptor = getAdaptor();
  const viewStateFromBridge = useHostContext("viewState") as T | null;

  const [viewState, _setViewState] = useState<T | null>(() => {
    if (viewStateFromBridge !== null) {
      return filterViewContext(viewStateFromBridge);
    }

    return typeof defaultState === "function"
      ? defaultState()
      : (defaultState ?? null);
  });

  useEffect(() => {
    if (viewStateFromBridge !== null) {
      _setViewState(filterViewContext(viewStateFromBridge));
    }
  }, [viewStateFromBridge]);

  const setViewState = useCallback(
    (state: SetStateAction<T | null>) => {
      _setViewState((prevState) => {
        const newState = typeof state === "function" ? state(prevState) : state;
        const stateToSet = injectViewContext(newState);

        if (stateToSet !== null) {
          adaptor.setViewState(stateToSet);
        }

        return filterViewContext(stateToSet);
      });
    },
    [adaptor],
  );

  return [viewState, setViewState] as const;
}
