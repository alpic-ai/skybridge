import { type SetStateAction, useCallback, useEffect, useState } from "react";
import { getAdaptor, useHostContext } from "../bridges/index.js";
import { filterViewContext, injectViewContext } from "../helpers/state.js";
import type { UnknownObject } from "../types.js";

/**
 * Persist a piece of UI state on the host, so it survives view remounts and
 * is restored on subsequent renders of the same tool invocation.
 *
 * Returns a `[state, setState]` pair with the same ergonomics as
 * `useState`. State is filtered to strip Skybridge-internal context fields
 * (see {@link DataLLM}) before being returned to your component.
 *
 * Provide a `defaultState` (value or lazy initializer) to get a non-nullable
 * tuple; omit it for `T | null`.
 *
 * @typeParam T - Shape of the persisted state. Must be a plain object.
 *
 * @example
 * ```tsx
 * const [filters, setFilters] = useViewState({ sort: "newest", page: 1 });
 * setFilters((f) => ({ ...f, page: f.page + 1 }));
 * ```
 *
 * @see https://docs.skybridge.tech/api-reference/use-view-state
 */
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
